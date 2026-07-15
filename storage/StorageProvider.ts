
export interface StorageProvider {
  /**
   * Store a file buffer.
   * @param file Buffer containing file data.
   * @param filename Original filename (including extension).
   * @param mimeType MIME type of file.
   * @param userId ID of the uploading user.
   * @param organizationId ID of the user's organization.
   * @returns Promise resolving to stored file identifier.
   */
  store(
    file: Buffer,
    filename: string,
    mimeType: string,
    userId: string,
    organizationId: string
  ): Promise<{ fileId: string }>

  /**
   * Delete a stored file by its identifier.
   */
  /**
   * Retrieve a stored file buffer by its identifier.
   */
  getFile(fileId: string): Promise<Buffer>;
  /**
   * Delete a stored file by its identifier.
   */
  delete(fileId: string): Promise<void>;
}
