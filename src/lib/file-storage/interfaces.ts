export interface FileStorage {
    uploadFile: (file: File) => Promise<{
        id: string;
        sizeInBytes: number;
    }>;
    uploadJson: (file: object) => Promise<{
        id: string;
        sizeInBytes: number;
    }>;
}