<?php
$query = "SELECT companyName FROM tblcompanies LIMIT 1";
$data = [
    "server_name" => "mysql",
    "tool_name" => "execute_sql",
    "arguments" => [
        "query" => $query
    ]
];

echo "Testing MCP mysql connection...\n";
var_dump($data);

// Try to execute the query through MCP
$result = shell_exec('echo \'' . json_encode($data) . '\' | mcp');
echo "\nResult:\n";
var_dump($result);
?>
