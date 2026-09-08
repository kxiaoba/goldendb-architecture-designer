// Compatibility projection for pre-R10 fixtures with unique names only.
// Preserve every number, placement, audit and display value; only translate the
// newly introduced identity representation to the old fixture representation.
export function normalizeTenantIdentity(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data) return JSON.stringify(data);
  const tenants = data.tenantPlans || [];
  if (new Set(tenants.map(t => t.name)).size !== tenants.length) throw new Error('Identity projection requires unique fixture names');
  const byId = new Map(tenants.filter(t => t.tenantId).map(t => [t.tenantId, t]));
  function text(value) {
    const gtmLabel = /^GTM-(TID\d+) 专属$/.exec(value);
    if (gtmLabel && byId.has(gtmLabel[1])) return `GTM-${byId.get(gtmLabel[1]).tenantNo} 专属`;
    const gtmGroup = /^GTM Group (TID\d+)( · \d+ 实例副本)$/.exec(value);
    if (gtmGroup && byId.has(gtmGroup[1])) return `GTM Group ${byId.get(gtmGroup[1]).tenantNo}${gtmGroup[2]}`;
    const pool = /^tenant-(TID\d+)$/.exec(value);
    if (pool && byId.has(pool[1])) return `tenant-${byId.get(pool[1]).tenantNo}`;
    const role = /^(TID\d+)(-(?:CN\d+|DN-G\d+(?:-(?:Master|Slave\d*))?|GTM\d*))?$/.exec(value);
    if (role && byId.has(role[1])) return byId.get(role[1]).name + (role[2] || '');
    return value;
  }
  function visit(value) {
    if (typeof value === 'string') return text(value);
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
      .filter(([key]) => key !== 'tenantId').map(([key, item]) => [text(key), visit(item)]));
    return value;
  }
  return JSON.stringify(visit(data));
}
