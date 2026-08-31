<?php

/**
 * whois_for_pages.php
 * ───────────────────
 * Standalone WHOIS proxy for remote TCP-43 lookups.
 *
 * Deploy this file on any PHP host that allows outbound TCP connections
 * (fsockopen).  The Cloudflare Worker (or any other client) calls it with:
 *
 *   GET /whois_for_pages.php?domain=example.com&server=whois.example.net&query=%s%0D%0A
 *
 * Parameters
 * ----------
 *   domain  (required)  Domain name to query, e.g. "google.com"
 *   server  (required)  WHOIS server hostname, e.g. "whois.verisign-grs.com"
 *   query   (optional)  Query template; %s is replaced by the domain.
 *                       Defaults to "%s\r\n".  Use "%s/e\r\n" for JPRS,
 *                       "-T dn %s\r\n" for DENIC, etc.
 *
 * Response
 * --------
 *   200  text/plain   Raw WHOIS output from the server
 *   400  text/plain   Missing or invalid parameters
 *   502  text/plain   TCP connection failed or timed out
 *
 * Security
 * --------
 *   - domain & server are validated against a strict hostname regex
 *   - No shell execution, no eval, no database access
 *   - Connection timeout defaults to 10 seconds
 */

// ── Helpers ──────────────────────────────────────────────────────────

function send_error(int $code, string $message): never
{
    http_response_code($code);
    header('Content-Type: text/plain; charset=UTF-8');
    echo $message . "\n";
    exit;
}

function validate_hostname(string $value, string $label): void
{
    // Allow plain hostnames and punycode (xn--...) labels
    if (!preg_match('/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)*$/i', $value)) {
        send_error(400, "Error: invalid {$label} format: '{$value}'");
    }
}

// ── Input ────────────────────────────────────────────────────────────

$domain = isset($_GET['domain']) ? trim($_GET['domain']) : '';
$server = isset($_GET['server']) ? trim($_GET['server']) : '';
$queryTemplate = isset($_GET['query']) ? $_GET['query'] : "%s\r\n";

if ($domain === '') {
    send_error(400, "Error: 'domain' parameter is required.");
}
if ($server === '') {
    send_error(400, "Error: 'server' parameter is required.");
}

validate_hostname($domain, 'domain');
validate_hostname($server, 'server');

// Build the actual query string
$query = str_replace('%s', $domain, $queryTemplate);

// ── WHOIS TCP lookup ────────────────────────────────────────────────

const WHOIS_PORT    = 43;
const CONNECT_TIMEOUT = 10;   // seconds
const READ_TIMEOUT    = 10;   // seconds

$errno  = 0;
$errstr = '';

$socket = @fsockopen($server, WHOIS_PORT, $errno, $errstr, CONNECT_TIMEOUT);

if (!$socket) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Error: cannot connect to {$server}:{$WHOIS_PORT} ({$errno}) {$errstr}\n";
    exit;
}

stream_set_timeout($socket, READ_TIMEOUT);
fwrite($socket, $query);

$result = '';
while (!feof($socket)) {
    $chunk = fread($socket, 4096);
    if ($chunk === false) {
        break;
    }
    $result .= $chunk;
}

fclose($socket);

// ─ Output ───────────────────────────────────────────────────────────

if ($result === '') {
    http_response_code(502);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Error: empty response from {$server}\n";
    exit;
}

header('Content-Type: text/plain; charset=UTF-8');
header('X-Whois-Domain: ' . $domain);
header('X-Whois-Server: ' . $server);
echo $result;
