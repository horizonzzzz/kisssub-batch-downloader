import { Form } from "antd"
import type { FormInstance } from "antd"

import type { Settings } from "../lib/types"
import { SiteManagementView } from "./site-management-view"

type OptionsSitesPageProps = {
  form: FormInstance<Settings>
}

export function OptionsSitesPage({ form }: OptionsSitesPageProps) {
  return <Form.Item noStyle shouldUpdate>{() => <SiteManagementView form={form} />}</Form.Item>
}
