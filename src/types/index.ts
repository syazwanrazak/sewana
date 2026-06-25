export type RentalType = 'full' | 'room' | 'parking'
export type UnitType = 'full' | 'room' | 'parking'
export type PaymentStatus = 'paid' | 'pending' | 'late'
export type MaintenanceStatus = 'open' | 'progress' | 'resolved'
export type MaintenancePriority = 'high' | 'med' | 'low'
export type ContractStatus = 'active' | 'expired' | 'terminated'
export type DocCategory = 'Owner Contracts' | 'Tenant Agreements' | 'Receipts' | 'Reports'

export interface Owner {
  id: string
  name: string
  email?: string
  phone?: string
  created_at: string
}

export interface Property {
  id: string
  owner_id?: string
  name: string
  address: string
  block?: string
  level?: string
  unit_no?: string
  kind: string // 'Apartment Block', 'Full Unit', 'Mixed Use', 'Room Rental'
  contract_expiry?: string
  color: string
  created_at: string
  owner?: Owner
  units?: Unit[]
}

export interface Unit {
  id: string
  property_id: string
  name: string
  unit_type: UnitType
  price: number
  is_occupied: boolean
  created_at: string
  tenant?: Tenant
}

export interface Tenant {
  id: string
  name: string
  email?: string
  phone?: string
  color: string
  created_at: string
  contracts?: Contract[]
}

export interface Contract {
  id: string
  tenant_id: string
  unit_id: string
  property_id: string
  rental_type: RentalType
  monthly_rent: number
  deposit: number
  start_date: string
  end_date: string
  status: ContractStatus
  created_at: string
  tenant?: Tenant
  unit?: Unit
  property?: Property
}

export interface Payment {
  id: string
  contract_id?: string
  tenant_id: string
  property_id: string
  amount: number
  due_date: string
  paid_date?: string
  status: PaymentStatus
  rental_type: RentalType
  notes?: string
  created_at: string
  tenant?: Tenant
  property?: Property
}

export interface MaintenanceTicket {
  id: string
  property_id: string
  unit_id?: string
  title: string
  description?: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  assignee?: string
  created_at: string
  resolved_at?: string
  property?: Property
  unit?: Unit
}

export interface Document {
  id: string
  property_id?: string
  tenant_id?: string
  name: string
  category: DocCategory
  rental_type_tag?: string
  file_url: string
  file_size?: string
  file_type: string // 'PDF', 'DOC', 'IMG'
  created_at: string
  property?: Property
  tenant?: Tenant
}

// UI view models
export interface PropertyVM {
  id: string
  name: string
  address: string
  kind: string
  color: string
  roomCount: number
  parkCount: number
  occupancy: number
  monthlyRevenue: number
  contract: string
  owner: string
}

export interface TenantVM {
  id: string
  name: string
  initials: string
  color: string
  property: string
  sub: string
  type: RentalType
  rent: number
  status: PaymentStatus
  since: string
  deposit: number
}

export interface DashboardStats {
  totalProperties: number
  activeTenants: number
  occupancyRate: number
  monthlyRevenue: number
  pendingPayments: number
  overduePayments: number
}
