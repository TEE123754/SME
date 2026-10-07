import type { PoolClient } from 'pg';
export type MemberBenefit = {
  memberVersion: number;
  programVersion: number;
  basisPoints: number;
  savingsSen: number;
};
export async function currentBenefit(c: PoolClient, cid: string) {
  const r = (
    await c.query(
      `SELECT l.version AS "memberVersion",p.version AS "programVersion",LEAST(p.discount_basis_points,COALESCE((bp.ethics->>'maxDiscountPercent')::integer,15)*100) AS "basisPoints" FROM app.customer_loyalty l JOIN app.loyalty_programs p ON p.business_id=l.business_id LEFT JOIN app.business_profiles bp ON bp.business_id=l.business_id WHERE l.customer_id=$1 AND l.active AND p.enabled`,
      [cid],
    )
  ).rows[0];
  return r as Omit<MemberBenefit, 'savingsSen'> | undefined;
}
