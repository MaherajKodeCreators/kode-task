export type Doctor = {
  id: string
  name: string
  specialization: string
  email: string | null
  phone: string | null
  isActive: boolean
  availabilityCount?: number
}

export type AvailabilityDay = {
  id: string
  doctorId: string
  doctor?: { id: string; name: string; specialization: string; isActive: boolean }
  date: string
  startTime: string
  endTime: string
}

export type DoctorBreak = {
  id: string
  doctorId: string
  doctor?: { id: string; name: string; specialization: string }
  date: string
  startTime: string
  endTime: string
}

export type Slot = {
  startTime: string
  endTime: string
  label: string
}

export type Appointment = {
  id: string
  date: string
  startTime: string
  endTime: string
  label: string
  status: 'BOOKED' | 'CANCELLED'
  createdAt: string
  doctor: { id: string; name: string; specialization: string }
}
