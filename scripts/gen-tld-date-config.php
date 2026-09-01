<?php

/**
 * Generates src/data/tld-date-config.ts from the original PHP project.
 *
 * The PHP reference implementation (20260818/) gives every extension its own
 * Parser subclass, and date handling is driven by two protected properties:
 *
 *   protected string  $timezone   = "UTC";   // source timezone of the stamps
 *   protected ?string $dateFormat = null;    // PHP date() format, when not ISO
 *
 * Rather than transcribing those by hand (error prone, 82 classes), this reads
 * them through reflection and emits the TypeScript lookup table.
 *
 * The file is written directly (rather than piped through a shell redirect)
 * so it is always UTF-8 regardless of the terminal's encoding.
 *
 * Usage: php scripts/gen-tld-date-config.php
 */

declare(strict_types=1);

$parsersDir = __DIR__ . "/../20260818/src/Parsers";
$outputPath = __DIR__ . "/../src/data/tld-date-config.ts";

// Buffer everything and write it out once, as UTF-8.
ob_start();

foreach (glob($parsersDir . "/Parser*.php") as $file) {
  require_once $file;
}

$factoryRef = new ReflectionClass("ParserFactory");
$mapProperty = $factoryRef->getProperty("extensionToClassSuffix");
$mapProperty->setAccessible(true);
$extensionToClassSuffix = $mapProperty->getValue();

$entries = [];

foreach ($extensionToClassSuffix as $classSuffix => $extensions) {
  $class = "Parser" . strtoupper((string) $classSuffix);

  if (!class_exists($class)) {
    fwrite(STDERR, "WARNING: missing class {$class}\n");
    continue;
  }

  $classRef = new ReflectionClass($class);
  $defaults = $classRef->getDefaultProperties();

  $timezone = $defaults["timezone"] ?? "UTC";
  $dateFormat = $defaults["dateFormat"] ?? null;

  if ($timezone === "UTC" && $dateFormat === null) {
    // Nothing overrides the base class: no entry needed.
    continue;
  }

  $entries[] = [
    "extensions" => array_values($extensions),
    "timezone" => $timezone,
    "dateFormat" => $dateFormat,
  ];
}

// Sort by first extension so the generated file is stable across runs.
usort($entries, fn($a, $b) => strcmp($a["extensions"][0], $b["extensions"][0]));

$now = date("Y-m-d");

echo "/**\n";
echo " * Per-extension date parsing rules, generated from the original PHP project.\n";
echo " *\n";
echo " * Source: 20260818/src/Parsers/Parser*.php (properties \$timezone / \$dateFormat)\n";
echo " * Generator: scripts/gen-tld-date-config.php\n";
echo " *\n";
echo " * Generated on {$now} - do not edit by hand, re-run the generator instead.\n";
echo " *\n";
echo " * A registry prints its timestamps in its own local timezone and often in a\n";
echo " * non-ISO format. Parsing those with a bare `new Date()` silently produces\n";
echo " * wrong values: it assumes UTC, and for formats such as d/m/Y it even swaps\n";
echo " * day and month. These rules reproduce what the PHP project does.\n";
echo " */\n\n";
echo "export interface TldDateConfig {\n";
echo "  /** IANA timezone the registry stamps are written in. Defaults to UTC. */\n";
echo "  timezone?: string;\n";
echo "  /** PHP date() format of the stamps, absent when they are already parseable. */\n";
echo "  dateFormat?: string;\n";
echo "}\n\n";
echo "type Rules = Record<string, TldDateConfig>;\n\n";
echo "const RULES: Rules = {\n";

foreach ($entries as $entry) {
  $extensions = $entry["extensions"];
  $timezone = $entry["timezone"];
  $dateFormat = $entry["dateFormat"];

  $parts = [];
  if ($timezone !== "UTC") {
    $parts[] = "timezone: " . json_encode($timezone, JSON_UNESCAPED_SLASHES);
  }
  if ($dateFormat !== null) {
    $parts[] = "dateFormat: " . json_encode($dateFormat, JSON_UNESCAPED_SLASHES);
  }

  $value = "{ " . implode(", ", $parts) . " }";

  foreach ($extensions as $extension) {
    $key = json_encode($extension, JSON_UNESCAPED_UNICODE);
    echo "  {$key}: {$value},\n";
  }
}

echo "};\n\n";
echo "/** Rules for one extension, or undefined when it uses the UTC / ISO default. */\n";
echo "export function getTldDateConfig(extension: string): TldDateConfig | undefined {\n";
echo "  return RULES[extension.toLowerCase()];\n";
echo "}\n";

$content = (string) ob_get_clean();

if (file_put_contents($outputPath, $content) === false) {
  fwrite(STDERR, "ERROR: could not write {$outputPath}\n");
  exit(1);
}

fwrite(STDERR, "Wrote {$outputPath} (" . count($entries) . " rule groups)\n");
