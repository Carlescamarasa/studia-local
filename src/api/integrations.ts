// Eliminado: importación de base44Client, ya no es necesaria
// Reemplazado por lógica local con almacenamiento en localStorage
// Las integraciones no están disponibles en modo local

// Stubs para integraciones - no hacen nada en modo local
const stubIntegration = (name: string) => async () => {
    throw new Error(`${name} no disponible en modo local`);
};

export const Core = {
    InvokeLLM: stubIntegration('InvokeLLM'),
    SendEmail: stubIntegration('SendEmail'),
    UploadFile: stubIntegration('UploadFile'),
    GenerateImage: stubIntegration('GenerateImage'),
    ExtractDataFromUploadedFile: stubIntegration('ExtractDataFromUploadedFile'),
    CreateFileSignedUrl: stubIntegration('CreateFileSignedUrl'),
    UploadPrivateFile: stubIntegration('UploadPrivateFile'),
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;
