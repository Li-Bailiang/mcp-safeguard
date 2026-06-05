// Test cases that should NOT be detected (false positives)

// Using correct package names
const { Server } = require('@modelcontextprotocol/sdk/server');
import { Client } from '@modelcontextprotocol/sdk/client';

// Standard libraries
const fs = require('fs');
const path = require('path');
