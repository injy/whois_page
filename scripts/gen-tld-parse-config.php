<?php

/**
 * Generates src/data/tld-parse-config.ts from the PHP reference project.
 *
 * The reference gives each extension its own Parser subclass, and subclasses
 * refine two things:
 *
 *   1. the regex used for a field  (getXxxRegExp hooks)
 *   2. HOW the matched text is turned into values
 *      (getNameServers / getStatus / getUpdatedDate / ... overrides)
 *
 * Both are read here instead of being transcribed: the regexes by invoking the
 * hook on a live instance (so an overridden getBaseRegExp() is already folded
 * in), the extraction modes by inspecting the overriding method's body.
 *
 * Only what differs from the base Parser is emitted; everything else falls
 * back to the base behaviour that the TypeScript side already implements.
 *
 * Usage: php scripts/gen-tld-parse-config.php
 */

declare(strict_types=1);

date_default_timezone_set("UTC");

$parsersDir = __DIR__ . "/../20260818/src/Parsers";
foreach (glob($parsersDir . "/Parser*.php") as $file) {
  require_once $file;
}

$outputPath = __DIR__ . "/../src/data/tld-parse-config.ts";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

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

/** Turns a PHP double-quoted literal as it appears in source into a real value. */
function unescapePhpString(string $literal): string
{
  $map = [
    "\\n" => "\n",
    "\\r" => "\r",
    "\\t" => "\t",
    "\\\\" => "\\",
    "\\\"" => "\"",
    "\\$" => "$",
    "\\0" => "\0",
    "\\e" => "\x1B",
  ];
  return strtr($literal, $map);
}

function bodyOf(ReflectionClass $ref, string $method): ?string
{
  if (!$ref->hasMethod($method)) {
    return null;
  }
  $m = $ref->getMethod($method);
  if ($m->getDeclaringClass()->getName() === Parser::class) {
    return null; // inherited, not overridden
  }
  $lines = file($m->getFileName());
  $raw = implode(
    "",
    array_slice($lines, $m->getStartLine() - 1, $m->getEndLine() - $m->getStartLine() + 1)
  );
  return preg_replace("/\s+/", " ", (string) $raw);
}

/** Extracts the separator arguments out of a ...FromExplode("x", "y") call. */
function explodeArgs(?string $body, string $helper): ?array
{
  if ($body === null || !str_contains($body, $helper)) {
    return null;
  }
  $pattern = '/' . preg_quote($helper, "/") . '\(\s*"((?:[^"\\\\]|\\\\.)*)"(?:\s*,\s*"((?:[^"\\\\]|\\\\.)*)")?\s*\)/';
  if (!preg_match($pattern, $body, $m)) {
    return null;
  }
  return [
    "sep" => unescapePhpString($m[1]),
    "subSep" => isset($m[2]) ? unescapePhpString($m[2]) : null,
  ];
}

// ---------------------------------------------------------------------------
// 1. base patterns
// ---------------------------------------------------------------------------

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

$base = new Parser("");
$basePatterns = [];
foreach ($regexHooks as $field => $method) {
  $ref = new ReflectionMethod($base, $method);
  $ref->setAccessible(true);
  $basePatterns[$field] = splitRegex((string) $ref->invoke($base));
}

// ---------------------------------------------------------------------------
// 2. per class overrides
// ---------------------------------------------------------------------------

$factoryRef = new ReflectionClass("ParserFactory");
$mapProperty = $factoryRef->getProperty("extensionToClassSuffix");
$mapProperty->setAccessible(true);
$extensionToClassSuffix = $mapProperty->getValue();

$rules = [];
$unhandled = [];

foreach ($extensionToClassSuffix as $classSuffix => $extensions) {
  $class = "Parser" . strtoupper((string) $classSuffix);
  if (!class_exists($class)) {
    continue;
  }

  $parser = new $class("");
  $ref = new ReflectionClass($class);
  $config = [];

  // --- field regexes ------------------------------------------------------
  foreach ($regexHooks as $field => $method) {
    $m = new ReflectionMethod($parser, $method);
    $m->setAccessible(true);
    $value = splitRegex((string) $m->invoke($parser));
    if ($value !== $basePatterns[$field]) {
      $config["patterns"][$field] = $value;
    }
  }

  // --- name servers -------------------------------------------------------
  $nsBody = bodyOf($ref, "getNameServers");
  if ($nsBody !== null) {
    $args = explodeArgs($nsBody, "getNameServersFromExplode");
    if ($args !== null) {
      // The PHP default for the sub separator is a single space.
      $config["ns"] = [
        "mode" => "explode",
        "sep" => $args["sep"],
        "subSep" => $args["subSep"] ?? " ",
      ];
    } elseif (str_contains($nsBody, "dns servers")) {
      $config["ns"] = ["mode" => "tn"];
    } else {
      $unhandled[] = "{$classSuffix}:getNameServers";
    }
  }

  // --- status -------------------------------------------------------------
  $statusBody = bodyOf($ref, "getStatus");
  if ($statusBody !== null) {
    $args = explodeArgs($statusBody, "getStatusFromExplode");
    if ($args !== null) {
      $item = ["mode" => "explode", "sep" => $args["sep"]];
      if ($args["subSep"] !== null) {
        $item["subSep"] = $args["subSep"];
      }
      $config["status"] = $item;
    } else {
      $known = [
        "Due to the redundancy of the state" => "bo",
        "Due to the redundancy of the eppstatus" => "fr",
        "Due to the redundancy of the status" => "ua",
        'yyyy-mm-dd' => "jp",
        'explode(" ", $item)[0]' => "qa",
        '(?: \\((.+)\\))?' => "lu",
      ];
      $matched = null;
      foreach ($known as $needle => $id) {
        if (str_contains($statusBody, $needle)) {
          $matched = $id;
          break;
        }
      }
      if ($matched !== null) {
        $config["status"] = ["mode" => $matched];
      } else {
        $unhandled[] = "{$classSuffix}:getStatus";
      }
    }
  }

  // --- updatedDate --------------------------------------------------------
  // Order matters: the override bodies end in `return "";`, so the distinctive
  // marker (array_key_last / contact:) must be checked before the fallback.
  $updBody = bodyOf($ref, "getUpdatedDate");
  if ($updBody !== null) {
    if (str_contains($updBody, "array_key_last")) {
      $config["updatedDate"] = "last";
    } elseif (str_contains($updBody, "contact:")) {
      $config["updatedDate"] = "beforeContact";
    } elseif (preg_match('/^\s*return\s*"";\s*$/', $updBody) || preg_match('/return\s*"";/', $updBody)) {
      // `return "";` as the whole body, or only as the trailing fallback.
      $config["updatedDate"] = "none";
    } else {
      $unhandled[] = "{$classSuffix}:getUpdatedDate";
    }
  }

  // --- availableDate ------------------------------------------------------
  $availBody = bodyOf($ref, "getAvailableDate");
  if ($availBody !== null && preg_match('/return\s*"";/', $availBody)) {
    $config["availableDate"] = "none";
  } elseif ($availBody !== null) {
    $unhandled[] = "{$classSuffix}:getAvailableDate";
  }

  // --- unregistered -------------------------------------------------------
  $unregBody = bodyOf($ref, "getUnregistered");
  if ($unregBody !== null) {
    if (str_contains($unregBody, "static/update.txt")) {
      $config["unregistered"] = "bb";
    } elseif (str_contains($unregBody, "Existe(n) 0 dominio")) {
      $config["unregistered"] = "cu";
    } else {
      $unhandled[] = "{$classSuffix}:getUnregistered";
    }
  }

  // --- dnssec -------------------------------------------------------------
  $dnssecBody = bodyOf($ref, "getDNSSECSigned");
  if ($dnssecBody !== null) {
    if (str_contains($dnssecBody, "zone signed")) {
      $config["dnssec"] = "zoneSignedDs";
    } else {
      $unhandled[] = "{$classSuffix}:getDNSSECSigned";
    }
  }

  if (!$config) {
    continue;
  }

  foreach (array_values($extensions) as $extension) {
    $rules[$extension] = $config;
  }
}

ksort($rules);

// ---------------------------------------------------------------------------
// 3. emit TypeScript
// ---------------------------------------------------------------------------

$json = fn($v) => json_encode(
  $v,
  JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

$now = date("Y-m-d");

ob_start();

echo "/**\n";
echo " * Per-extension parsing rules, generated from the original PHP project.\n";
echo " *\n";
echo " * Source:    20260818/src/Parsers/Parser*.php\n";
echo " * Generator: scripts/gen-tld-parse-config.php\n";
echo " *\n";
echo " * Generated on {$now} - do not edit by hand, re-run the generator instead.\n";
echo " *\n";
echo " * The reference project gives every extension a Parser subclass. A subclass\n";
echo " * can refine the regex used for a field and/or the way the matched text is\n";
echo " * turned into values. Only the differences from the base Parser are listed\n";
echo " * here; anything absent uses the base behaviour.\n";
echo " */\n\n";

echo "export interface FieldPattern {\n";
echo "  source: string;\n";
echo "  flags: string;\n";
echo "}\n\n";

echo "export type TldField =\n";
$fieldNames = array_keys($regexHooks);
// Leading pipe only: "| a" then "| b" would read as "a | | b".
foreach ($fieldNames as $i => $f) {
  $sep = $i === count($fieldNames) - 1 ? ";" : "";
  echo "  | \"{$f}\"{$sep}\n";
}
echo "\n";

echo "/** Base behaviour: every \"Name Server:\" line, first token, lowercased. */\n";
echo "export type NsRule =\n";
echo "  | { mode: \"explode\"; sep: string; subSep: string }\n";
echo "  | { mode: \"tn\" };\n\n";

echo "/** Base behaviour: every status line, splitting off a trailing link. */\n";
echo "export type StatusRule =\n";
echo "  | { mode: \"explode\"; sep: string; subSep?: string }\n";
echo "  | { mode: \"bo\" | \"fr\" | \"jp\" | \"lu\" | \"qa\" | \"ua\" };\n\n";

echo "export interface TldParseConfig {\n";
echo "  patterns?: Partial<Record<TldField, FieldPattern>>;\n";
echo "  ns?: NsRule;\n";
echo "  status?: StatusRule;\n";
echo "  updatedDate?: \"none\" | \"last\" | \"beforeContact\";\n";
echo "  availableDate?: \"none\";\n";
echo "  unregistered?: \"bb\" | \"cu\";\n";
echo "  dnssec?: \"zoneSignedDs\";\n";
echo "}\n\n";

echo "export const BASE_PATTERNS: Record<TldField, FieldPattern> = {\n";
foreach ($basePatterns as $field => $p) {
  echo "  {$field}: { source: {$json($p["source"])}, flags: {$json($p["flags"])} },\n";
}
echo "};\n\n";

echo "type Rules = Record<string, TldParseConfig>;\n\n";
echo "const RULES: Rules = {\n";
foreach ($rules as $extension => $config) {
  $parts = [];
  if (isset($config["patterns"])) {
    $entries = [];
    foreach ($config["patterns"] as $field => $p) {
      $entries[] = "{$field}: { source: {$json($p["source"])}, flags: {$json($p["flags"])} }";
    }
    $parts[] = "patterns: { " . implode(", ", $entries) . " }";
  }
  foreach (["ns", "status", "updatedDate", "availableDate", "unregistered", "dnssec"] as $key) {
    if (isset($config[$key])) {
      $parts[] = "{$key}: " . $json($config[$key]);
    }
  }
  echo "  {$json($extension)}: { " . implode(", ", $parts) . " },\n";
}
echo "};\n\n";

echo "/** Rules for one extension, or undefined when the base behaviour applies. */\n";
echo "export function getTldParseConfig(extension: string): TldParseConfig | undefined {\n";
echo "  return RULES[extension.toLowerCase()];\n";
echo "}\n";

file_put_contents($outputPath, (string) ob_get_clean());

fwrite(STDERR, "Wrote {$outputPath} (" . count($rules) . " extensions)\n");

foreach ($unhandled as $item) {
  fwrite(STDERR, "UNHANDLED: {$item}\n");
}
