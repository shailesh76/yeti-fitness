import { SupabaseClient } from '@supabase/supabase-js';

export type FeatureKey = 'ai_coach' | 'workout_tracking' | 'advanced_analytics' | 'progression_engine' | 'coach_access';

export class EntitlementService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * The single source of truth for feature access.
   * Mobile Apps and Edge Functions call this, NEVER RevenueCat directly.
   */
  async canAccess(userId: string, feature: FeatureKey): Promise<boolean> {
    try {
      // 1. Check Global Beta Mode
      const { data: betaConfig } = await this.supabase
        .from('beta_mode_config')
        .select('is_global_beta_active')
        .single();

      if (betaConfig?.is_global_beta_active) {
        // In global beta, if the feature is a PRO feature, return true.
        const { data: proFeature } = await this.supabase
          .from('plan_features')
          .select('enabled')
          .eq('plan_id', 'PRO')
          .eq('feature_id', feature)
          .single();
          
        if (proFeature?.enabled) return true;
      }

      // 2. Check Explicit User Entitlements (RevenueCat, Admin, Beta Grant)
      const { data: entitlements } = await this.supabase
        .from('user_entitlements')
        .select('plan_id, status')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!entitlements || entitlements.length === 0) {
        // Fallback to FREE plan checking
        return await this.checkPlanFeature('FREE', feature);
      }

      // 3. Check if any active plan grants the feature
      for (const ent of entitlements) {
        const hasFeature = await this.checkPlanFeature(ent.plan_id, feature);
        if (hasFeature) return true;
      }

      return false;

    } catch (e) {
      console.error('[Entitlements] Failed to verify access', e);
      return false; // Fail secure
    }
  }

  private async checkPlanFeature(planId: string, feature: FeatureKey): Promise<boolean> {
    const { data } = await this.supabase
      .from('plan_features')
      .select('enabled')
      .eq('plan_id', planId)
      .eq('feature_id', feature)
      .single();
      
    return data?.enabled ?? false;
  }

  /**
   * Grants PRO access to a user and logs the action immutably.
   */
  async grantBetaAccess(userId: string, adminId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_entitlements')
      .upsert({ user_id: userId, plan_id: 'PRO', source: 'beta_grant', status: 'active' });

    if (!error) {
      await this.supabase.from('entitlement_history').insert({
        user_id: userId,
        action: 'PRO_GRANTED',
        new_entitlement: 'PRO',
        source: 'beta_grant',
        performed_by: adminId
      });
    }
  }
}
