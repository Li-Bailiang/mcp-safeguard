import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { parse as parseYaml } from 'yaml';
import { minimatch } from 'minimatch';

/**
 * Configuration schema types
 */
export interface McpShieldConfig {
  extends?: string | string[];
  rules?: RuleConfig;
  ignore?: string[];
  severity?: SeverityConfig;
  languages?: string[];
  output?: OutputConfig;
}

export interface RuleConfig {
  [ruleId: string]: RuleSeverity | RuleOptions;
}

export type RuleSeverity = 'error' | 'warn' | 'off';

export interface RuleOptions {
  severity: RuleSeverity;
  options?: Record<string, any>;
}

export interface SeverityConfig {
  failOn?: 'low' | 'medium' | 'high' | 'critical';
}

export interface OutputConfig {
  format?: 'json' | 'text' | 'sarif' | 'html';
  path?: string;
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedConfig extends McpShieldConfig {
  rules: RuleConfig;
  ignore: string[];
  severity: Required<SeverityConfig>;
  languages: string[];
  output: Required<OutputConfig>;
}

/**
 * Configuration file names in order of precedence
 */
const CONFIG_FILES = [
  '.mcp-safeguardrc.js',
  '.mcp-safeguardrc.json',
  '.mcp-safeguardrc.yaml',
  '.mcp-safeguardrc.yml',
  '.mcp-safeguardrc',
  'mcp-safeguard.config.js',
  'mcp-safeguard.config.json',
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ResolvedConfig = {
  rules: {},
  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
  ],
  severity: {
    failOn: 'high',
  },
  languages: ['javascript', 'typescript', 'python', 'go'],
  output: {
    format: 'text',
    path: './reports/',
  },
};

/**
 * Environment variable overrides
 */
const ENV_OVERRIDES = {
  MCP_SAFEGUARD_FAIL_ON: (config: ResolvedConfig, value: string) => {
    config.severity.failOn = value as any;
  },
  MCP_SAFEGUARD_OUTPUT_FORMAT: (config: ResolvedConfig, value: string) => {
    config.output.format = value as any;
  },
  MCP_SAFEGUARD_OUTPUT_PATH: (config: ResolvedConfig, value: string) => {
    config.output.path = value;
  },
};

/**
 * ConfigLoader - Discovers and loads configuration files
 */
export class ConfigLoader {
  private cache = new Map<string, ResolvedConfig>();

  /**
   * Load configuration for a given directory
   * Walks up the directory tree to find config files
   */
  async load(searchPath: string, options?: { configPath?: string }): Promise<ResolvedConfig> {
    const cacheKey = options?.configPath || searchPath;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let config: McpShieldConfig;
    // Directory that relative `extends` paths are resolved against. It must be
    // the directory of the config file we actually loaded — not the search path
    // — otherwise a discovered `.mcp-safeguardrc.json` that extends `./base.json`
    // would look for the base file one directory too high.
    let configBaseDir = resolve(searchPath);

    if (options?.configPath) {
      // Load from specified path
      config = await this.loadConfigFile(options.configPath);
      configBaseDir = dirname(resolve(options.configPath));
    } else {
      // Discover config file
      const configPath = this.discoverConfig(searchPath);
      if (configPath) {
        config = await this.loadConfigFile(configPath);
        configBaseDir = dirname(configPath);
      } else {
        config = {};
      }
    }

    // Process extends
    if (config.extends) {
      config = await this.processExtends(config, configBaseDir);
    }

    // Merge with defaults
    const resolved = this.mergeWithDefaults(config);

    // Apply environment variable overrides
    this.applyEnvOverrides(resolved);

    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  /**
   * Discover config file by walking up directory tree
   */
  private discoverConfig(startPath: string): string | null {
    let currentPath = resolve(startPath);
    const root = resolve('/');

    while (currentPath !== root) {
      for (const configFile of CONFIG_FILES) {
        const configPath = join(currentPath, configFile);
        if (existsSync(configPath)) {
          return configPath;
        }
      }

      const parentPath = dirname(currentPath);
      if (parentPath === currentPath) break;
      currentPath = parentPath;
    }

    return null;
  }

  /**
   * Load and parse a config file
   */
  private async loadConfigFile(configPath: string): Promise<McpShieldConfig> {
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const ext = configPath.split('.').pop();

    if (configPath.endsWith('.js')) {
      // Dynamic import for JS config
      const module = await import(configPath);
      return module.default || module;
    }

    const content = readFileSync(configPath, 'utf-8');

    if (ext === 'json' || configPath.endsWith('.mcp-safeguardrc')) {
      try {
        return JSON.parse(content);
      } catch (e) {
        throw new Error(`Failed to parse JSON config: ${configPath}`);
      }
    }

    if (ext === 'yaml' || ext === 'yml') {
      try {
        return parseYaml(content);
      } catch (e) {
        throw new Error(`Failed to parse YAML config: ${configPath}`);
      }
    }

    throw new Error(`Unsupported config file format: ${configPath}`);
  }

  /**
   * Process extends directive
   */
  private async processExtends(
    config: McpShieldConfig,
    basePath: string
  ): Promise<McpShieldConfig> {
    const extendsArray = Array.isArray(config.extends) ? config.extends : [config.extends!];
    let merged: McpShieldConfig = {};

    for (const extendPath of extendsArray) {
      let extendedConfig: McpShieldConfig;
      // Nested `extends` inside the extended file must resolve relative to that
      // file's own directory, so track it per-extend.
      let extendedBaseDir = basePath;

      if (extendPath.startsWith('@mcp-safeguard/')) {
        // Load preset
        extendedConfig = await this.loadPreset(extendPath);
      } else {
        // Load relative path
        const fullPath = resolve(basePath, extendPath);
        extendedConfig = await this.loadConfigFile(fullPath);
        extendedBaseDir = dirname(fullPath);
      }

      // Recursively process extends
      if (extendedConfig.extends) {
        extendedConfig = await this.processExtends(extendedConfig, extendedBaseDir);
      }

      merged = this.mergeConfigs(merged, extendedConfig);
    }

    // Merge base config on top
    const { extends: _, ...baseConfig } = config;
    return this.mergeConfigs(merged, baseConfig);
  }

  /**
   * Load a preset package
   */
  private async loadPreset(presetName: string): Promise<McpShieldConfig> {
    try {
      // Try to require the preset package
      const presetModule = await import(presetName);
      return presetModule.default || presetModule;
    } catch (e) {
      throw new Error(`Failed to load preset: ${presetName}. Make sure it's installed.`);
    }
  }

  /**
   * Merge two config objects
   */
  private mergeConfigs(base: McpShieldConfig, override: McpShieldConfig): McpShieldConfig {
    return {
      ...base,
      ...override,
      rules: {
        ...base.rules,
        ...override.rules,
      },
      ignore: [...(base.ignore || []), ...(override.ignore || [])],
      severity: {
        ...base.severity,
        ...override.severity,
      },
      languages: override.languages || base.languages,
      output: {
        ...base.output,
        ...override.output,
      },
    };
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: McpShieldConfig): ResolvedConfig {
    return {
      rules: {
        ...DEFAULT_CONFIG.rules,
        ...config.rules,
      },
      ignore: [...DEFAULT_CONFIG.ignore, ...(config.ignore || [])],
      severity: {
        ...DEFAULT_CONFIG.severity,
        ...config.severity,
      },
      languages: config.languages || DEFAULT_CONFIG.languages,
      output: {
        ...DEFAULT_CONFIG.output,
        ...config.output,
      },
    };
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvOverrides(config: ResolvedConfig): void {
    for (const [envVar, applier] of Object.entries(ENV_OVERRIDES)) {
      const value = process.env[envVar];
      if (value) {
        applier(config, value);
      }
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * ConfigValidator - Validates configuration against schema
 */
export class ConfigValidator {
  /**
   * Validate a configuration object
   */
  validate(config: McpShieldConfig): ValidationResult {
    const errors: string[] = [];

    // Validate rules
    if (config.rules) {
      for (const [ruleId, ruleValue] of Object.entries(config.rules)) {
        if (!this.isValidRuleValue(ruleValue)) {
          errors.push(`Invalid rule configuration for '${ruleId}': must be 'error', 'warn', 'off', or an object with severity`);
        }
      }
    }

    // Validate severity
    if (config.severity?.failOn) {
      const validLevels = ['low', 'medium', 'high', 'critical'];
      if (!validLevels.includes(config.severity.failOn)) {
        errors.push(`Invalid severity.failOn: must be one of ${validLevels.join(', ')}`);
      }
    }

    // Validate output format
    if (config.output?.format) {
      const validFormats = ['json', 'text', 'sarif', 'html'];
      if (!validFormats.includes(config.output.format)) {
        errors.push(`Invalid output.format: must be one of ${validFormats.join(', ')}`);
      }
    }

    // Validate languages
    if (config.languages) {
      if (!Array.isArray(config.languages)) {
        errors.push('languages must be an array');
      }
    }

    // Validate ignore patterns
    if (config.ignore) {
      if (!Array.isArray(config.ignore)) {
        errors.push('ignore must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isValidRuleValue(value: any): boolean {
    if (typeof value === 'string') {
      return ['error', 'warn', 'off'].includes(value);
    }
    if (typeof value === 'object' && value !== null) {
      return ['error', 'warn', 'off'].includes(value.severity);
    }
    return false;
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * PathMatcher - Matches file paths against ignore patterns
 */
export class PathMatcher {
  private patterns: string[];

  constructor(patterns: string[]) {
    this.patterns = patterns;
  }

  /**
   * Check if a path should be ignored
   */
  shouldIgnore(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of this.patterns) {
      // `dot: true` so patterns also match dotfiles/dot-directories.
      // `matchBase: true` so a slash-less pattern like `*.test.js` matches the
      // basename at any depth (gitignore-like), which is what users expect from
      // an ignore list — without it, `*.test.js` would only match top-level files.
      if (minimatch(normalizedPath, pattern, { dot: true, matchBase: true })) {
        return true;
      }
    }

    return false;
  }

  /**
   * Filter an array of paths
   */
  filter(paths: string[]): string[] {
    return paths.filter(path => !this.shouldIgnore(path));
  }
}

/**
 * RuleFilter - Filters and applies rule configurations
 */
export class RuleFilter {
  private config: RuleConfig;

  constructor(config: RuleConfig) {
    this.config = config;
  }

  /**
   * Check if a rule is enabled
   */
  isEnabled(ruleId: string): boolean {
    const ruleValue = this.config[ruleId];
    if (!ruleValue) return true; // Default enabled

    if (typeof ruleValue === 'string') {
      return ruleValue !== 'off';
    }

    return ruleValue.severity !== 'off';
  }

  /**
   * Get the effective severity for a rule
   */
  getSeverity(ruleId: string): RuleSeverity | null {
    const ruleValue = this.config[ruleId];
    if (!ruleValue) return null; // Use default

    if (typeof ruleValue === 'string') {
      return ruleValue;
    }

    return ruleValue.severity;
  }

  /**
   * Get rule options
   */
  getOptions(ruleId: string): Record<string, any> | undefined {
    const ruleValue = this.config[ruleId];
    if (!ruleValue || typeof ruleValue === 'string') {
      return undefined;
    }

    return ruleValue.options;
  }

  /**
   * Filter findings based on rule configuration
   */
  filterFindings(findings: any[]): any[] {
    return findings.filter(finding => {
      const ruleId = finding.check_id || finding.id;
      return this.isEnabled(ruleId);
    });
  }

  /**
   * Apply severity overrides to findings
   */
  applySeverityOverrides(findings: any[]): any[] {
    return findings.map(finding => {
      const ruleId = finding.check_id || finding.id;
      const severity = this.getSeverity(ruleId);

      if (severity) {
        return {
          ...finding,
          severity: this.mapSeverity(severity),
        };
      }

      return finding;
    });
  }

  private mapSeverity(ruleSeverity: RuleSeverity): string {
    switch (ruleSeverity) {
      case 'error':
        return 'ERROR';
      case 'warn':
        return 'WARNING';
      case 'off':
        return 'INFO';
      default:
        return 'INFO';
    }
  }
}

/**
 * Export a singleton instance
 */
export const configLoader = new ConfigLoader();
export const configValidator = new ConfigValidator();
