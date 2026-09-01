<?php

/**
 * Cross-check oracle: runs the ORIGINAL PHP parser over the shared case list.
 *
 * For every case it asks the real registry parser (chosen by ParserFactory,
 * exactly as production does) to convert the stamp, so the TypeScript
 * implementation can be diffed against ground truth rather than guesses.
 *
 * Usage: php scripts/xcheck/php_oracle.php   (prints JSON)
 */

declare(strict_types=1);

date_default_timezone_set("UTC");

$parsersDir = __DIR__ . "/../../20260818/src/Parsers";
foreach (glob($parsersDir . "/Parser*.php") as $file) {
  require_once $file;
}

$cases = json_decode((string) file_get_contents(__DIR__ . "/cases.json"), true);
if (!is_array($cases)) {
  fwrite(STDERR, "cases.json could not be read\n");
  exit(1);
}

$out = [];

foreach ($cases as $case) {
  $extension = (string) $case["ext"];
  $input = (string) $case["input"];

  $parser = ParserFactory::create($extension, "");

  $method = new ReflectionMethod($parser, "getISO8601");
  $method->setAccessible(true);

  $iso = $method->invoke($parser, $input);

  $out[] = [
    "ext" => $extension,
    "input" => $input,
    "iso" => $iso,
  ];
}

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
