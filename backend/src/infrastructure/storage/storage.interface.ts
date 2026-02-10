export interface IStorageService {
    uploadToTemp(file:Buffer): Promise<{url: string, publicId: string}>;
    makePermanent(publicId: string): Promise<string>;

}