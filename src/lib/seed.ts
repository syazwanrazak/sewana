import { Property, Tenant, Payment, Document } from '@/types'

export const PROPERTIES: Property[] = [
  {
    id: 'p1', name: 'Residensi Harmoni', address: 'Block A, Jalan Harmoni 3, Shah Alam',
    kind: 'Apartment Block', color: '#0F766E', contract_expiry: '2026-12-31',
    created_at: '2024-01-15',
    owner: { id: 'o1', name: 'Hj. Osman Kadir', email: 'osman@email.com', phone: '012-388 7766', created_at: '2024-01-01' },
    units: [
      { id: 'u1', property_id: 'p1', name: 'Bilik A', unit_type: 'room', price: 650, is_occupied: true, created_at: '2024-01-15' },
      { id: 'u2', property_id: 'p1', name: 'Bilik B', unit_type: 'room', price: 650, is_occupied: true, created_at: '2024-01-15' },
      { id: 'u3', property_id: 'p1', name: 'Bilik C', unit_type: 'room', price: 700, is_occupied: false, created_at: '2024-01-15' },
      { id: 'u4', property_id: 'p1', name: 'Bilik D', unit_type: 'room', price: 700, is_occupied: true, created_at: '2024-01-15' },
      { id: 'u5', property_id: 'p1', name: 'P1', unit_type: 'parking', price: 100, is_occupied: true, created_at: '2024-01-15' },
      { id: 'u6', property_id: 'p1', name: 'P2', unit_type: 'parking', price: 100, is_occupied: false, created_at: '2024-01-15' },
    ],
  },
  {
    id: 'p2', name: 'Vista Setapak', address: 'D-12-3, Vista Condo, Setapak, KL',
    kind: 'Full Unit', color: '#1D4ED8', contract_expiry: '2026-08-14',
    created_at: '2023-09-01',
    owner: { id: 'o2', name: 'Datin Mariamah', email: 'mariamah@email.com', phone: '019-212 3344', created_at: '2023-09-01' },
    units: [
      { id: 'u7', property_id: 'p2', name: 'Unit Penuh', unit_type: 'full', price: 1800, is_occupied: true, created_at: '2023-09-01' },
      { id: 'u8', property_id: 'p2', name: 'P1', unit_type: 'parking', price: 120, is_occupied: true, created_at: '2023-09-01' },
    ],
  },
  {
    id: 'p3', name: 'Bilik Sewa Wangsa Maju', address: 'No. 45, Jalan WM 7, Wangsa Maju, KL',
    kind: 'Room Rental', color: '#B45309', contract_expiry: '2027-03-31',
    created_at: '2024-03-01',
    owner: { id: 'o1', name: 'Hj. Osman Kadir', email: 'osman@email.com', phone: '012-388 7766', created_at: '2024-01-01' },
    units: [
      { id: 'u9',  property_id: 'p3', name: 'Bilik 1', unit_type: 'room', price: 580, is_occupied: true, created_at: '2024-03-01' },
      { id: 'u10', property_id: 'p3', name: 'Bilik 2', unit_type: 'room', price: 580, is_occupied: true, created_at: '2024-03-01' },
      { id: 'u11', property_id: 'p3', name: 'Bilik 3', unit_type: 'room', price: 600, is_occupied: true, created_at: '2024-03-01' },
      { id: 'u12', property_id: 'p3', name: 'Bilik 4', unit_type: 'room', price: 600, is_occupied: false, created_at: '2024-03-01' },
      { id: 'u13', property_id: 'p3', name: 'Bilik 5', unit_type: 'room', price: 620, is_occupied: true, created_at: '2024-03-01' },
    ],
  },
  {
    id: 'p4', name: 'Willow House PJ', address: '7, Jalan SS2/24, Petaling Jaya',
    kind: 'Full Unit', color: '#7C3AED', contract_expiry: '2024-12-31',
    created_at: '2023-01-01',
    owner: { id: 'o3', name: 'Encik Rashdan', email: 'rashdan@email.com', phone: '016-788 9900', created_at: '2023-01-01' },
    units: [
      { id: 'u14', property_id: 'p4', name: 'Unit Penuh', unit_type: 'full', price: 2200, is_occupied: true, created_at: '2023-01-01' },
      { id: 'u15', property_id: 'p4', name: 'Garaj', unit_type: 'parking', price: 0, is_occupied: true, created_at: '2023-01-01' },
    ],
  },
  {
    id: 'p5', name: 'Aspen Suites Cyberjaya', address: 'Tower B, Persiaran Apec, Cyberjaya',
    kind: 'Room Rental', color: '#0891B2', contract_expiry: '2027-01-31',
    created_at: '2024-06-01',
    owner: { id: 'o2', name: 'Datin Mariamah', email: 'mariamah@email.com', phone: '019-212 3344', created_at: '2023-09-01' },
    units: [
      { id: 'u16', property_id: 'p5', name: 'Suite 1', unit_type: 'room', price: 750, is_occupied: true, created_at: '2024-06-01' },
      { id: 'u17', property_id: 'p5', name: 'Suite 2', unit_type: 'room', price: 750, is_occupied: true, created_at: '2024-06-01' },
      { id: 'u18', property_id: 'p5', name: 'Suite 3', unit_type: 'room', price: 780, is_occupied: true, created_at: '2024-06-01' },
      { id: 'u19', property_id: 'p5', name: 'Suite 4', unit_type: 'room', price: 780, is_occupied: false, created_at: '2024-06-01' },
      { id: 'u20', property_id: 'p5', name: 'Suite 5', unit_type: 'room', price: 800, is_occupied: false, created_at: '2024-06-01' },
    ],
  },
]

export const TENANTS: Tenant[] = [
  { id: 't1', name: 'Nurul Aisyah Binti Razak', color: '#0F766E', email: 'nurul@email.com', phone: '012-345 6789', created_at: '2024-03-01' },
  { id: 't2', name: 'Tan Wei Ming', color: '#1D4ED8', email: 'weiming@email.com', phone: '016-220 1133', created_at: '2023-09-01' },
  { id: 't3', name: 'Kumaravel Rajasekaran', color: '#B45309', email: 'kumar@email.com', phone: '019-887 4521', created_at: '2024-01-01' },
  { id: 't4', name: 'Siti Khadijah Mohd Ali', color: '#7C3AED', email: 'siti@email.com', phone: '011-2398 7766', created_at: '2024-03-01' },
  { id: 't5', name: 'Adam Firdaus Zulkifli', color: '#DB2777', email: 'adam@email.com', phone: '013-557 9090', created_at: '2024-06-01' },
  { id: 't6', name: 'Mei Ling Chong', color: '#0891B2', email: 'meiling@email.com', phone: '017-664 2210', created_at: '2024-06-01' },
  { id: 't7', name: 'Hafiz Bin Samat', color: '#16A34A', email: 'hafiz@email.com', phone: '014-332 8811', created_at: '2024-09-01' },
]

export const PAYMENTS: Payment[] = [
  { id: 'pay1', tenant_id: 't1', property_id: 'p1', amount: 650, due_date: '2026-06-01', paid_date: '2026-06-01', status: 'paid', rental_type: 'room', created_at: '2026-06-01' },
  { id: 'pay2', tenant_id: 't2', property_id: 'p2', amount: 1800, due_date: '2026-06-01', paid_date: '2026-06-01', status: 'paid', rental_type: 'full', created_at: '2026-06-01' },
  { id: 'pay3', tenant_id: 't3', property_id: 'p3', amount: 580, due_date: '2026-06-05', status: 'pending', rental_type: 'room', created_at: '2026-06-01' },
  { id: 'pay4', tenant_id: 't4', property_id: 'p3', amount: 580, due_date: '2026-05-28', status: 'late', rental_type: 'room', created_at: '2026-05-01' },
  { id: 'pay5', tenant_id: 't5', property_id: 'p4', amount: 2200, due_date: '2026-06-03', status: 'pending', rental_type: 'full', created_at: '2026-06-01' },
  { id: 'pay6', tenant_id: 't6', property_id: 'p5', amount: 750, due_date: '2026-06-01', paid_date: '2026-06-01', status: 'paid', rental_type: 'room', created_at: '2026-06-01' },
  { id: 'pay7', tenant_id: 't7', property_id: 'p1', amount: 100, due_date: '2026-06-05', status: 'pending', rental_type: 'parking', created_at: '2026-06-01' },
]

export const DOCUMENTS: Document[] = [
  { id: 'd1', property_id: 'p1', name: 'Perjanjian Tuan Tanah — Residensi Harmoni.pdf', category: 'Owner Contracts', rental_type_tag: 'Full Unit', file_url: '#', file_size: '1.2 MB', file_type: 'PDF', created_at: '2024-01-15' },
  { id: 'd2', tenant_id: 't1', name: 'Perjanjian Sewaan — Nurul Aisyah.pdf', category: 'Tenant Agreements', rental_type_tag: 'Room', file_url: '#', file_size: '840 KB', file_type: 'PDF', created_at: '2024-03-01' },
  { id: 'd3', property_id: 'p2', name: 'Resit Sewa Jun — Tan Wei Ming.pdf', category: 'Receipts', rental_type_tag: 'Full Unit', file_url: '#', file_size: '210 KB', file_type: 'PDF', created_at: '2026-06-01' },
  { id: 'd4', tenant_id: 't7', name: 'Lesen Tempat Letak Kereta — Hafiz.pdf', category: 'Tenant Agreements', rental_type_tag: 'Parking', file_url: '#', file_size: '320 KB', file_type: 'PDF', created_at: '2024-09-01' },
  { id: 'd5', name: 'Laporan Portfolio Q2 2026.doc', category: 'Reports', rental_type_tag: 'Laporan', file_url: '#', file_size: '2.4 MB', file_type: 'DOC', created_at: '2026-04-01' },
  { id: 'd6', property_id: 'p3', name: 'Pemeriksaan Hartanah — Wangsa Maju.jpg', category: 'Reports', rental_type_tag: 'Mixed', file_url: '#', file_size: '3.1 MB', file_type: 'IMG', created_at: '2026-05-15' },
]

// Helper: get total monthly rent potential for a property (all units, occupied or not)
export function propertyRevenue(p: Property): number {
  return (p.units || []).reduce((sum, u) => sum + u.price, 0)
}

// Helper: get occupancy % for a property
export function propertyOccupancy(p: Property): number {
  const units = p.units || []
  if (!units.length) return 0
  return Math.round((units.filter(u => u.is_occupied).length / units.length) * 100)
}
