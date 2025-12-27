import { remoteDataAPI } from './remote';

// Export 'api' as an alias for remoteDataAPI to satisfy imports like "import { api } from '../../api'"
export const api = remoteDataAPI;

// Export types and interfaces
export * from './appDataAPI';
