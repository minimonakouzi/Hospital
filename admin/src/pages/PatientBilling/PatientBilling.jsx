import React, { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import { BillingWorkspace } from "../StaffBilling/StaffBilling";
import {
  createAdminBill,
  deleteAdminBill,
  fetchAdminBills,
  updateAdminBill,
  updateAdminBillInsurance,
  updateAdminBillPayment,
} from "../../api/staffBillingApi";

export default function PatientBilling() {
  const { getToken } = useAuth();
  const api = useMemo(
    () => ({
      fetch: (filters) => fetchAdminBills(filters, getToken),
      create: (payload) => createAdminBill(payload, getToken),
      update: (id, payload) => updateAdminBill(id, payload, getToken),
      payment: (id, payload) => updateAdminBillPayment(id, payload, getToken),
      insurance: (id, payload) => updateAdminBillInsurance(id, payload, getToken),
      remove: (id) => deleteAdminBill(id, getToken),
    }),
    [getToken],
  );

  return (
    <AdminLayout
      title="Patient Billing"
      subtitle="Manage hospital invoices, manual payments, and insurance tracking."
    >
      <BillingWorkspace
        mode="admin"
        title="Patient Billing"
        subtitle="Manage hospital invoices, manual payments, and insurance tracking."
        api={api}
        header="admin"
        authMode="admin"
        getToken={getToken}
      />
    </AdminLayout>
  );
}
