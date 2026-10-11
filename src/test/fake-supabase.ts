type Operation = 'select' | 'insert' | 'update' | 'delete' | 'rpc';

export type FakeQuery = {
  table: string;
  operation: Operation;
  columns?: string;
  payload?: unknown;
  filters: Array<{ method: string; args: unknown[] }>;
};

type Result = { data?: unknown; error?: unknown };
type Handler = { match: (query: FakeQuery) => boolean; result: Result | ((query: FakeQuery) => Result) };

class FakeQueryBuilder implements PromiseLike<Result> {
  constructor(private query: FakeQuery, private run: (query: FakeQuery) => Result) {}

  private filter(method: string, ...args: unknown[]) {
    this.query.filters.push({ method, args });
    return this;
  }

  select(columns?: string) { this.query.columns = columns; return this; }
  insert(payload: unknown) { this.query.operation = 'insert'; this.query.payload = payload; return this; }
  update(payload: unknown) { this.query.operation = 'update'; this.query.payload = payload; return this; }
  delete() { this.query.operation = 'delete'; return this; }

  eq(...args: unknown[]) { return this.filter('eq', ...args); }
  neq(...args: unknown[]) { return this.filter('neq', ...args); }
  in(...args: unknown[]) { return this.filter('in', ...args); }
  gte(...args: unknown[]) { return this.filter('gte', ...args); }
  ilike(...args: unknown[]) { return this.filter('ilike', ...args); }
  or(...args: unknown[]) { return this.filter('or', ...args); }
  order(...args: unknown[]) { return this.filter('order', ...args); }
  limit(...args: unknown[]) { return this.filter('limit', ...args); }
  single() { return this; }
  maybeSingle() { return this; }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run(this.query)).then(onfulfilled, onrejected);
  }
}

// Supabase em memória para testes: registra cada consulta e devolve o resultado configurado.
export function createFakeSupabase() {
  const calls: FakeQuery[] = [];
  let handlers: Handler[] = [];

  const run = (query: FakeQuery): Result => {
    calls.push(query);
    // O handler registrado por último tem prioridade, para o teste sobrescrever o padrão do beforeEach
    const handler = [...handlers].reverse().find((h) => h.match(query));
    const result = typeof handler?.result === 'function' ? handler.result(query) : handler?.result;
    return { data: null, error: null, ...result };
  };

  const client = {
    from: (table: string) => new FakeQueryBuilder({ table, operation: 'select', filters: [] }, run),
    rpc: (name: string, args: unknown) =>
      Promise.resolve(run({ table: name, operation: 'rpc', payload: args, filters: [] })),
  };

  return {
    client,
    calls,
    on(table: string, operation: Operation, result: Handler['result'], where: (query: FakeQuery) => boolean = () => true) {
      handlers.push({ match: (q) => q.table === table && q.operation === operation && where(q), result });
    },
    find(table: string, operation: Operation, where: (query: FakeQuery) => boolean = () => true) {
      return calls.filter((q) => q.table === table && q.operation === operation && where(q));
    },
    reset() {
      calls.length = 0;
      handlers = [];
    },
  };
}

export const eqValue = (query: FakeQuery, column: string) =>
  query.filters.find((f) => f.method === 'eq' && f.args[0] === column)?.args[1];

export const fakeDb = createFakeSupabase();
