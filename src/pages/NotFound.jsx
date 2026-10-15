import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="pg-center">
      <EmptyState icon="fa-compass" title={t('nf.title')} body={t('nf.body')}
        action={<Link to="/" className="mf-btn mf-btn--primary">{t('nf.cta')}</Link>} />
    </main>
  );
}
