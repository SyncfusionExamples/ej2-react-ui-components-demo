import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icons, type AppModule } from './modules';

export default function PageHeader({ module, actions }: { module: AppModule; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div className="crumbs">
        <Link to="/dashboard">Dashboard</Link> <span>/</span> <span>{module.title}</span>
      </div>
      <div className="page-title-row">
        <span className="page-icon" style={{ background: module.color }}>{Icons[module.key]}</span>
        <div>
          <h1>
            {module.title} <span className="tag" style={{ color: module.color, borderColor: module.color }}>{module.tag}</span>
          </h1>
        </div>
        <div className="page-actions">{actions}</div>
      </div>
    </div>
  );
}
