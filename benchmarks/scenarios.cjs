/**
 * GSD-X Benchmark Scenarios
 *
 * Defines the 8 representative tasks comparing upstream Open GSD Core vs GSD-X.
 */

'use strict';

const SCENARIOS = [
  {
    id: 'scenario-1-simple-task',
    name: 'Scenario 1: Simple Task',
    task: 'Rename a function formatTimestamp and update references in logger.ts',
    agentRole: 'gsd-executor',
    category: 'trivial',
    description: 'Renaming an isolated utility function and updating its callers.',
    files: ['src/logger.ts', 'tests/logger.test.ts'],
    typicalOutputTokens: 250,
  },
  {
    id: 'scenario-2-small-bug',
    name: 'Scenario 2: Small Bug',
    task: 'Fix failing FastAPI endpoint returning 422 on optional query parameter page_size',
    agentRole: 'gsd-debugger',
    category: 'small',
    description: 'Fixing an input validation schema regression in an API route.',
    files: ['app/api/v1/routes.py', 'app/schemas/pagination.py', 'tests/test_routes.py'],
    typicalOutputTokens: 420,
  },
  {
    id: 'scenario-3-feature',
    name: 'Scenario 3: Feature',
    task: 'Add CRUD API endpoints and validation tests for CustomerProfile model',
    agentRole: 'gsd-executor',
    category: 'medium',
    description: 'Implementing standard REST endpoints with Pydantic validation and unit tests.',
    files: ['app/api/v1/customers.py', 'app/models/customer.py', 'tests/test_customers.py'],
    typicalOutputTokens: 1100,
  },
  {
    id: 'scenario-4-complex-feature',
    name: 'Scenario 4: Complex Feature',
    task: 'Implement WebSocket reconnect handling with exponential backoff and message deduplication queue',
    agentRole: 'gsd-executor',
    category: 'large',
    description: 'Real-time WebSocket client connection resilience and backoff state machine.',
    files: ['src/ws/client.ts', 'src/ws/reconnect.ts', 'src/ws/queue.ts', 'tests/ws.test.ts'],
    typicalOutputTokens: 1850,
  },
  {
    id: 'scenario-5-brownfield-feature',
    name: 'Scenario 5: Brownfield Feature',
    task: 'Add cursor-based pagination to existing order history query in large legacy repository',
    agentRole: 'gsd-executor',
    category: 'medium',
    description: 'Modifying an existing service layer query within a large codebase without breaking callers.',
    files: ['services/order_service.py', 'db/repositories/order_repo.py', 'api/orders.py'],
    typicalOutputTokens: 850,
  },
  {
    id: 'scenario-6-repeated-knowledge',
    name: 'Scenario 6: Repeated Knowledge',
    task: 'Implement webhook handler enforcing project-standard HMAC-SHA256 signature verification convention',
    agentRole: 'gsd-executor',
    category: 'medium',
    description: 'Executing a task requiring the same architecture and cryptographic convention established in Phase 1.',
    files: ['src/webhooks/receiver.ts', 'src/auth/hmac.ts', 'tests/webhooks.test.ts'],
    typicalOutputTokens: 650,
  },
  {
    id: 'scenario-7-long-running-project',
    name: 'Scenario 7: Long-running Project Simulation',
    task: 'Execute Phase 5 plan with extensive historical summaries accumulated from Phases 1-4',
    agentRole: 'gsd-executor',
    category: 'large',
    description: 'Simulates context bloat over a multi-month project with dozens of prior summaries and plans.',
    files: ['.planning/phases/5-sync/5.1-PLAN.md'],
    typicalOutputTokens: 1200,
  },
  {
    id: 'scenario-8-memory-recall',
    name: 'Scenario 8: Memory Recall',
    task: 'Fix intermittent redis timeout during worker pool warm-up (previously diagnosed in Phase 2)',
    agentRole: 'gsd-debugger',
    category: 'small',
    description: 'Resolving an issue where the exact root cause and solution was previously learned and stored in memory.',
    files: ['workers/pool.py', 'config/redis.py'],
    typicalOutputTokens: 350,
  },
];

module.exports = { SCENARIOS };
