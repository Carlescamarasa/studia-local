import React from 'react';
import ImportExportView from '@/features/importExport/components/ImportExportView';

export default function ImportExportPage({ embedded = false }) {
  return <ImportExportView embedded={embedded} />;
}
