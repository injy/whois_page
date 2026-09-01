<?php

/**
 * Dev tool: dumps how the PHP reference project parses each extension.
 *
 * For every Parser subclass it reports
 *   - the regex actually returned by each getXxxRegExp() field hook, but only
 *     when it differs from the base Parser (so the output stays readable);
 *   - which non-regex methods the subclass overrides, i.e. where the reference
 *     does more than a "Key: Value" match.
 *
 * Usage: php scripts/inspect-parsers.php [--full]
 *        --full  also print the base patterns and the identical fields
 */

declare(strict_types=1);

date_default_timezone_set("UTC");

$parsersDir = __DIR__ . "/../20260818/src/Parsers";
foreach (glob($parsersDir . "/Parser*.php") as $file) {
  require_once $file;
}

/** PHP "/pattern/is" -> ["source" => "pattern", "flags" => "is"] */
function splitRegex(string $re): array
{
  $delimiter = $re[0];
  $end = strrpos($re, $delimiter);
  if ($end === false || $end === 0) {
    return ["source" => $re, "flags" => ""];
  }
  return [
    "source" => substr($re, 1, $end - 1),
    "flags" => substr($re, $end + 1),
  ];
}

/** Field hooks that only produce a regex. */
$regexHooks = [
  "domain" => "getDomainRegExp",
  "reserved" => "getReservedRegExp",
  "unregistered" => "getUnregisteredRegExp",
  "registryWebsite" => "getRegistryWebsiteRegExp",
  "registryWHOISServer" => "getRegistryWHOISServerRegExp",
  "registrar" => "getRegistrarRegExp",
  "registrarURL" => "getRegistrarURLRegExp",
  "registrarIANAId" => "getRegistrarIANAIdRegExp",
  "registrarWHOISServer" => "getRegistrarWHOISServerRegExp",
  "creationDate" => "getCreationDateRegExp",
  "expirationDate" => "getExpirationDateRegExp",
  "updatedDate" => "getUpdatedDateRegExp",
  "availableDate" => "getAvailableDateRegExp",
  "status" => "getStatusRegExp",
  "nameServers" => "getNameServersRegExp",
  "dnssec" => "getDNSSECSignedRegExp",
  "dnssecExtra" => "getDNSSECSignedExtraRegExp",
];

/** Methods whose body may hold real logic rather than a plain regex. */
$logicHooks = [
  "getDomain",
  "getReserved",
  "getUnregistered",
  "getRegistryWebsite",
  "getRegistryWHOISServer",
  "getRegistrar",
  "getRegistrarURL",
  "getRegistrarIANAId",
  "getRegistrarWHOISServer",
  "getCreationDate",
  "getExpirationDate",
  "getUpdatedDate",
  "getAvailableDate",
  "getStatus",
  "getNameServers",
  "getDNSSECSigned",
  "getBaseRegExp",
  "removeEmptyValues",
];

function callHook(object $parser, string $method)
{
  $ref = new ReflectionMethod($parser, $method);
  $ref->setAccessible(true);
  return $ref->invoke($parser);
}

$full = in_array("--full", $argv ?? [], true);

// ---- baseline: the plain Parser -------------------------------------------
$base = new Parser("");
$basePatterns = [];
foreach ($regexHooks as $field => $method) {
  $basePatterns[$field] = splitRegex((string) callHook($base, $method));
}

// ---- every subclass reachable from the factory ----------------------------
$factoryRef = new ReflectionClass("ParserFactory");
$mapProperty = $factoryRef->getProperty("extensionToClassSuffix");
$mapProperty->setAccessible(true);
$extensionToClassSuffix = $mapProperty->getValue();

$classes = [];

foreach ($extensionToClassSuffix as $classSuffix => $extensions) {
  $class = "Parser" . strtoupper((string) $classSuffix);
  if (!class_exists($class)) {
    continue;
  }

  $parser = new $class("");
  $ref = new ReflectionClass($class);

  $regexOverrides = [];
  $identical = [];

  foreach ($regexHooks as $field => $method) {
    if (!$ref->hasMethod($method)) {
      continue;
    }
    $value = splitRegex((string) callHook($parser, $method));
    if ($value === $basePatterns[$field]) {
      $identical[] = $field;
    } else {
      $regexOverrides[$field] = $value;
    }
  }

  $overridden = [];
  foreach ($logicHooks as $method) {
    if (!$ref->hasMethod($method)) {
      continue;
    }
    if ($ref->getMethod($method)->getDeclaringClass()->getName() !== Parser::class) {
      $overridden[] = $method;
    }
  }

  $classes[$classSuffix] = [
    "extensions" => array_values($extensions),
    "regex" => $regexOverrides,
    "logic" => $overridden,
  ];

  if ($full) {
    $classes[$classSuffix]["same_as_base"] = $identical;
  }
}

// Written directly so the file is always UTF-8, whatever the terminal does.
$json = json_encode(
  [
    "base" => $basePatterns,
    "classes" => $classes,
  ],
  JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

$outputPath = $argv[1] ?? __DIR__ . "/xcheck/_inspect.json";
if (str_starts_with($outputPath, "-")) {
  $outputPath = __DIR__ . "/xcheck/_inspect.json";
}

file_put_contents($outputPath, $json);
fwrite(STDERR, "Wrote {$outputPath} (" . count($classes) . " classes)\n");
