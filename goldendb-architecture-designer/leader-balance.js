/* Initial-plan leader count optimization. No replica migration or database commands.
 * Independently implemented successive shortest paths; see docs/leader-balance-algorithm.md.
 */
(function(root) {
  'use strict';
  const LIMITS = { hosts: 2000, groups: 2000, edges: 50000, work: 2000000 };
  const text = x => typeof x === 'string' && x.length > 0 && x.length <= 256;
  const key = (a, b) => JSON.stringify([a, b]);
  const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;

  function solve(input, options = {}) {
    let work = 0, edges = 0;
    const result = { schema: 'goldendb-leader-balance-v1', status: 'invalid', optimal: false,
      applied: false, assignments: [], changes: [], domains: [], errors: [], work: 0,
      meaning: '仅优化同一可用区/资源池内已有副本候选的主数量；不代表负载均衡、选主配置或生产准入。' };
    const finish = () => ({ ...result, work, edges });
    const bad = message => { result.errors.push(message); return finish(); };
    if (!options || typeof options !== 'object' || Array.isArray(options)) return bad('检查选项非法');
    const maxWork = options.maxWork ?? LIMITS.work, maxEdges = options.maxEdges ?? LIMITS.edges;
    if (!Number.isSafeInteger(maxWork) || maxWork < 1 || maxWork > LIMITS.work
      || !Number.isSafeInteger(maxEdges) || maxEdges < 1 || maxEdges > LIMITS.edges) return bad('检查预算非法');
    if (!input || !Array.isArray(input.hosts) || !Array.isArray(input.groups)
      || input.hosts.length > LIMITS.hosts || input.groups.length > LIMITS.groups) return bad('主机或分片清单缺失/超限');
    const hosts = new Map(), groups = new Map(), tenantHosts = new Map();
    for (const h of input.hosts) {
      if (!h || !text(h.id) || !text(h.domainId) || hosts.has(h.id)
        || !Number.isSafeInteger(h.baseLeaders ?? 0) || (h.baseLeaders ?? 0) < 0 || (h.baseLeaders ?? 0) > LIMITS.groups) return bad('主机身份、故障域或固定主数量非法');
      hosts.set(h.id, { id: h.id, domainId: h.domainId, baseLeaders: h.baseLeaders ?? 0 });
    }
    let candidates = 0;
    for (const g of input.groups) {
      if (!g || !text(g.id) || !text(g.tenantId) || !text(g.domainId) || groups.has(g.id)
        || !Array.isArray(g.candidateHostIds) || !g.candidateHostIds.length
        || g.candidateHostIds.length > LIMITS.hosts || ![undefined,true,false].includes(g.locked)) return bad('分片身份、候选清单或锁定标记非法');
      const ids = new Set(g.candidateHostIds);
      if (ids.size !== g.candidateHostIds.length || !ids.has(g.currentHostId)) return bad('候选重复或不含当前主宿主机');
      for (const id of ids) if (!hosts.has(id) || hosts.get(id).domainId !== g.domainId) return bad('候选主机不存在或跨可用区/资源池');
      candidates += ids.size;
      if (candidates > maxEdges) { result.status = 'budget-exceeded'; return finish(); }
      const k = key(g.tenantId, g.domainId);
      if (!tenantHosts.has(k)) tenantHosts.set(k, new Set());
      for (const id of ids) tenantHosts.get(k).add(id);
      groups.set(g.id, { ...g, candidateHostIds: [...ids].sort(order) });
    }
    if (input.tenantScopes !== undefined) {
      if (!Array.isArray(input.tenantScopes) || input.tenantScopes.length > LIMITS.groups) return bad('租户均衡范围非法');
      const seen = new Set();
      for (const scope of input.tenantScopes) {
        if (!scope || !text(scope.tenantId) || !text(scope.domainId) || !Array.isArray(scope.hostIds)
          || !scope.hostIds.length || scope.hostIds.length > LIMITS.hosts) return bad('租户均衡范围缺失或超限');
        const k=key(scope.tenantId,scope.domainId),ids=new Set(scope.hostIds);
        if(seen.has(k)||ids.size!==scope.hostIds.length||!tenantHosts.has(k)
          || [...tenantHosts.get(k)].some(id=>!ids.has(id))
          || [...ids].some(id=>!hosts.has(id)||hosts.get(id).domainId!==scope.domainId)) return bad('租户范围重复、遗漏候选或跨故障域');
        seen.add(k);tenantHosts.set(k,ids);
      }
      if(seen.size!==tenantHosts.size)return bad('租户均衡范围须覆盖全部租户/可用区');
    }
    if (!groups.size) { result.status = 'not-needed'; result.optimal = true; return finish(); }
    const list = [...groups.values()].sort((a,b) => order(a.id,b.id));
    const graph = [], node = () => { graph.push([]); return graph.length - 1; };
    const source = node(), sink = node(), hostNodes = new Map(), pairNodes = new Map();
    const hostDegrees = new Map(), pairDegrees = new Map(), choices = new Map();
    const budget = {}; // A private sentinel; partial flows are never returned as a plan.
    const add = (a,b,cost) => {
      if (++edges > maxEdges) throw budget;
      const f = { to:b, rev:graph[b].length, cap:1, cost }, r = { to:a, rev:graph[a].length, cap:0, cost:-cost };
      graph[a].push(f); graph[b].push(r); return f;
    };
    const n = BigInt(list.length), fixed = BigInt([...hosts.values()].reduce((s,h)=>s+h.baseLeaders,0));
    const globalWeight = n + 1n;
    // Lexicographic: tenant/domain sum of squares, then all-tenant host sum of squares, then changes.
    const tenantWeight = (n + fixed) ** 2n * globalWeight + n + 1n;
    try {
      for (const h of [...hosts.values()].sort((a,b)=>order(a.id,b.id))) hostNodes.set(h.id,node());
      for (const g of list) {
        const gn = node(); add(source,gn,0n); const links = [];
        for (const hid of g.candidateHostIds) {
          if (g.locked && hid !== g.currentHostId) continue;
          const k = key(g.tenantId,hid);
          if (!pairNodes.has(k)) pairNodes.set(k,node());
          pairDegrees.set(k,(pairDegrees.get(k)||0)+1);
          hostDegrees.set(hid,(hostDegrees.get(hid)||0)+1);
          links.push({ hostId:hid, edge:add(gn,pairNodes.get(k),hid === g.currentHostId ? 0n : 1n) });
        }
        choices.set(g.id,links);
      }
      for (const [k,pn] of pairNodes) {
        const [,hid] = JSON.parse(k);
        for (let i=1;i<=pairDegrees.get(k);i++) add(pn,hostNodes.get(hid),BigInt(2*i-1)*tenantWeight);
      }
      for (const [hid,degree] of hostDegrees) {
        for (let i=1;i<=degree;i++) add(hostNodes.get(hid),sink,BigInt(2*(hosts.get(hid).baseLeaders+i)-1)*globalWeight);
      }
      const potentials = graph.map(()=>0n);
      // Binary heap uses node ID as a deterministic tie break.
      const less = (a,b) => a.d < b.d || a.d === b.d && a.v < b.v;
      for (let flow=0;flow<list.length;flow++) {
        const dist = graph.map(()=>null), prev = graph.map(()=>null), heap = [];
        const push = x => { let i=heap.length;heap.push(x);while(i){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;} };
        const pop = () => { const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let j=i,l=i*2+1,r=l+1;if(l<heap.length&&less(heap[l],heap[j]))j=l;if(r<heap.length&&less(heap[r],heap[j]))j=r;if(j===i)break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return first; };
        dist[source]=0n;push({v:source,d:0n});
        while(heap.length) {
          if (++work > maxWork) throw budget;
          const {v,d}=pop();if(dist[v]!==d)continue;
          for(let i=0;i<graph[v].length;i++) {
            if (++work > maxWork) throw budget;
            const e=graph[v][i];if(!e.cap)continue;
            const nd=d+e.cost+potentials[v]-potentials[e.to];
            if(dist[e.to]===null||nd<dist[e.to]){dist[e.to]=nd;prev[e.to]=[v,i];push({v:e.to,d:nd});}
          }
        }
        if(dist[sink]===null) { result.status='infeasible';return finish(); }
        for(let v=0;v<graph.length;v++)if(dist[v]!==null)potentials[v]+=dist[v];
        for(let v=sink;v!==source;){const [u,i]=prev[v],e=graph[u][i];e.cap--;graph[v][e.rev].cap++;v=u;}
      }
    } catch (e) { if(e!==budget)throw e;result.status='budget-exceeded';return finish(); }
    const assignment = new Map(list.map(g=>[g.id,choices.get(g.id).find(x=>!x.edge.cap).hostId]));
    const summarize = mapping => {
      const tenantCounts = new Map(), total = new Map([...hosts].map(([id,h])=>[id,h.baseLeaders]));
      for (const [k,ids] of tenantHosts) tenantCounts.set(k,new Map([...ids].map(id=>[id,0])));
      for(const g of list){const hid=mapping.get(g.id),counts=tenantCounts.get(key(g.tenantId,g.domainId));counts.set(hid,counts.get(hid)+1);total.set(hid,total.get(hid)+1);}
      const tenants=[...tenantCounts].map(([k,c])=>{const [tenantId,domainId]=JSON.parse(k),rows=[...c].sort(([a],[b])=>order(a,b)).map(([hostId,leaders])=>({hostId,leaders}));return {tenantId,domainId,hosts:rows,spread:Math.max(...c.values())-Math.min(...c.values())};});
      const domains=[...new Set([...hosts.values()].map(h=>h.domainId))].sort(order).map(domainId=>{const rows=[...hosts.values()].filter(h=>h.domainId===domainId).map(h=>({hostId:h.id,leaders:total.get(h.id)})).sort((a,b)=>order(a.hostId,b.hostId));return {domainId,hosts:rows,spread:Math.max(...rows.map(h=>h.leaders))-Math.min(...rows.map(h=>h.leaders))};});
      return {tenants,domains,tenantSquares:[...tenantCounts.values()].reduce((s,c)=>s+[...c.values()].reduce((v,x)=>v+x*x,0),0),hostSquares:[...total.values()].reduce((s,x)=>s+x*x,0)};
    };
    result.before=summarize(new Map(list.map(g=>[g.id,g.currentHostId])));
    result.after=summarize(assignment);result.domains=result.after.domains;
    result.assignments=list.map(g=>({groupId:g.id,hostId:assignment.get(g.id)}));
    result.changes=list.filter(g=>assignment.get(g.id)!==g.currentHostId).map(g=>({groupId:g.id,fromHostId:g.currentHostId,toHostId:assignment.get(g.id)}));
    result.optimal=true;
    result.status=[...result.after.tenants,...result.after.domains].every(x=>x.spread<=1)?'balanced':'constrained';
    return finish();
  }
  const api={solve,LIMITS:Object.freeze({...LIMITS})};root.GoldenDBLeaderBalance=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
