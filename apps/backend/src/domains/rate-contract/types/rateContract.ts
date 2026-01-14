export interface RateContractMaster {
  rate_contract_id: number;
  contract_name: string;
  customer_type: 'DIRECT' | 'SUB_DEALER' | 'ALL';
  cylinder_type_id: number;
  rate_per_cylinder: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateRateContractRequest {
  contract_name: string;
  customer_type: 'DIRECT' | 'SUB_DEALER' | 'ALL';
  cylinder_type_id: number;
  rate_per_cylinder: number;
  valid_from: string;
  valid_to: string;
}

export interface UpdateRateContractRequest {
  contract_name?: string;
  customer_type?: 'DIRECT' | 'SUB_DEALER' | 'ALL';
  cylinder_type_id?: number;
  rate_per_cylinder?: number;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}
