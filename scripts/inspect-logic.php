<?php

/**
 * Dev tool: deduplicates the bodies of the overridden "logic" methods.
 *
 * Many of the 81 parsers override getNameServers()/getStatus()/... with the
 * exact same one-liner calling a base-class helper with different arguments.
 * Grouping by body shows how many genuinely distinct implementations there
 * are, which is what actually has to be ported by hand.
 *
 * Usage: php scripts/inspect-logic.php [methodName ...]
 */

declare(strict_types=1);

date_default_timezone_set("UTC");

$parsersDir = __DIR__ . "/../20260818/src/Parsers";
foreach (glob($parsersDir . "/Parser*.php") as $file) {
  require_once $file;
}

$hooks = array_slice($argv, 1);
if (!$hooks) {
  $hooks = [
    "getNameServers",
    "getStatus",
    "getUpdatedDate",
    "getBaseRegExp",
    "getUnregistered",
    "getDNSSECSigned",
    "getAvailableDate",
    "getDomain",
    "getRegistrar",
  ];
}

$factoryRef = new ReflectionClass("ParserFactory");
$mapProperty = $factoryRef->getProperty("extensionToClassSuffix");
$mapProperty->setAccessible(true);
$extensionToClassSuffix = $mapProperty->getValue();

/** method => [normalised body => [classSuffix, ...]] */
$groups = [];

foreach ($extensionToClassSuffix as $classSuffix => $extensions) {
  $class = "Parser" . strtoupper((string) $classSuffix);
  if (!class_exists($class)) {
    continue;
  }

  $ref = new ReflectionClass($class);

  foreach ($hooks as $method) {
    if (!$ref->hasMethod($method)) {
      continue;
    }
    $m = $ref->getMethod($method);
    if ($m->getDeclaringClass()->getName() === Parser::class) {
      continue; // not overridden
    }

    $file = $m->getFileName();
    $lines = file($file);
    $body = implode(
      "",
      array_slice($lines, $m->getStartLine() - 1, $m->getEndLine() - $m->getStartLine() + 1)
    );

    // Keep only the inside of the method, collapsed to a single line.
    $body = preg_replace("/\s+/", " ", (string) $body);
    if (!preg_match("/\{(.*)\}\s*$/", $body, $mm)) {
      continue;
    }
    $inner = trim($mm[1]);

    $groups[$method][$inner][] = (string) $classSuffix;
  }
}

foreach ($groups as $method => $bodies) {
  echo "======== {$method} : " . count($bodies) . " distinct implementation(s) ========\n";
  uasort($bodies, fn($a, $b) => count($b) - count($a));
  foreach ($bodies as $body => $classes) {
    echo "  [" . count($classes) . "] " . implode(",", $classes) . "\n";
    echo "      " . $body . "\n";
  }
  echo "\n";
}
