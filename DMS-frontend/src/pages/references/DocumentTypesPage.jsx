import { documentTypesApi } from '~/api';
import ReferencePage from './ReferencePage';

const config = { key: 'document-types', api: documentTypesApi, i18n: 'documentTypes' };

export default function DocumentTypesPage() {
  return <ReferencePage config={config} />;
}
