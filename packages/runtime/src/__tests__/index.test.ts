import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { MCPSafeguardRuntime } from '../index.js';

describe('MCPSafeguardRuntime', () => {
  let runtime: MCPSafeguardRuntime;

  before(() => {
    runtime = new MCPSafeguardRuntime({
      blockDangerousTools: true,
      logAllInteractions: false,
      maxToolCallsPerMinute: 10,
      promptInjectionDetection: true,
    });
    runtime.init();
  });

  it('should initialize successfully', () => {
    const newRuntime = new MCPSafeguardRuntime();
    newRuntime.init();
    assert.ok(newRuntime);
  });

  it('should block dangerous tools', async () => {
    const execTool = async (cmd: string) => {
      return `Executed: ${cmd}`;
    };

    const wrappedExec = runtime.wrapToolCall('exec', execTool);

    await assert.rejects(
      async () => await wrappedExec('rm -rf /'),
      /Tool call blocked/
    );
  });

  it('should allow safe tools', async () => {
    const safeTool = async (data: string) => {
      return `Processed: ${data}`;
    };

    const wrappedSafe = runtime.wrapToolCall('safe_tool', safeTool);
    const result = await wrappedSafe('test data');

    assert.strictEqual(result, 'Processed: test data');
  });

  it('should enforce allowlist when configured', async () => {
    const restrictedRuntime = new MCPSafeguardRuntime({
      allowedTools: ['read_file', 'write_file'],
    });
    restrictedRuntime.init();

    const tool = async () => 'result';
    const wrapped = restrictedRuntime.wrapToolCall('other_tool', tool);

    await assert.rejects(
      async () => await wrapped(),
      /not in allowlist/
    );
  });

  it('should track tool metrics', async () => {
    const tool = async (x: number) => x * 2;
    const wrapped = runtime.wrapToolCall('math_tool', tool);

    await wrapped(5);
    await wrapped(10);

    const metrics = runtime.getToolMetrics('math_tool');
    assert.ok(metrics);
    assert.strictEqual(metrics.callCount, 2);
  });

  it('should record errors in metrics', async () => {
    const failingTool = async () => {
      throw new Error('Tool failed');
    };

    const wrapped = runtime.wrapToolCall('failing_tool', failingTool);

    try {
      await wrapped();
    } catch (e) {
      // Expected
    }

    const metrics = runtime.getToolMetrics('failing_tool');
    assert.ok(metrics);
    assert.strictEqual(metrics.errorCount, 1);
    assert.ok(metrics.lastError);
  });
});
