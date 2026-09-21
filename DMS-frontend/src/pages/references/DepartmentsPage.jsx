import { departmentsApi } from '~/api';
import ReferencePage from './ReferencePage';

const config = { key: 'departments', api: departmentsApi, i18n: 'departments', showUsers: true };

export default function DepartmentsPage() {
  return <ReferencePage config={config} />;
}
