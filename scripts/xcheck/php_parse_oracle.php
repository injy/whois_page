<?php

/**
 * PHP reference oracle for the full WHOIS/web parse.
 *
 * For every fixture it runs the real ParserFactory::create($ext, $text)
 * (so the production parser selection applies) and serialises the parsed
 * fields. Output is written as UTF-8 so the TS side can diff field-by-field.
 *
 * Usage: php scripts/xcheck/php_parse_oracle.php
 */

declare(strict_types=1);

date_default_timezone_set("UTC");

$parsersDir = __DIR__ . "/../../20260818/src/Parsers";
foreach (glob($parsersDir . "/Parser*.php") as $file) {
  require_once $file;
}

$fixtures = json_decode((string) file_get_contents(__DIR__ . "/fixtures-parse.json"), true);

$fields = [
  "domain", "reserved", "registered", "unknown", "registrar", "registrarURL",
  "registrarIANAId", "registrarWHOISServer", "creationDate", "creationDateISO8601",
  "expirationDate", "expirationDateISO8601", "updatedDate", "updatedDateISO8601",
  "availableDate", "availableDateISO8601", "nameServers", "dnssecSigned",
];

$out = [];
foreach ($fixtures as $f) {
  $parser = ParserFactory::create($f["ext"], $f["text"]);
  $row = ["ext" => $f["ext"]];
  foreach ($fields as $field) {
    $row[$field] = $parser->$field;
  }
  $out[] = $row;
}

file_put_contents(
  __DIR__ . "/_php_parse.json",
  json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);
fwrite(STDERR, "Wrote " . count($out) . " rows\n");
