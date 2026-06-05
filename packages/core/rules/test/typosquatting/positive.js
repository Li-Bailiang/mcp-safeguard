// Test cases that SHOULD be detected by typosquatting rules

// mcp-suspicious-package-name - should detect
const server = require("mcp-sevrer");
const client = require("mcp-clinet");
import { Server } from "mcps-server";

// mcp-homoglyph-attack - should detect (Cyrillic 'с' instead of Latin 'c')
const pkg = require("mсp-server");
