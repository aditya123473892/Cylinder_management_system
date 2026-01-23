export interface RateContractDetail {
  cylinder_type_id: number;
  rate_per_cylinder: number;
}

export interface RateContractMaster {
  rate_contract_id: number;
  contract_name: string;
  customer_id?: number;
  dealer_id?: number;
  customer_name?: string;
  dealer_name?: string;
  rates: RateContractDetail[];
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateRateContractRequest {
  contract_name: string;
  customer_id?: number;
  dealer_id?: number;
  rates: RateContractDetail[];
  valid_from: string;
  valid_to: string;
}

export interface UpdateRateContractRequest {
  contract_name?: string;
  customer_id?: number;
  dealer_id?: number;
  rates?: RateContractDetail[];
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}
