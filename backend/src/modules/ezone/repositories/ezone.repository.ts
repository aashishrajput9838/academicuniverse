import { EzoneAcademicProfile, IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';
import mongoose from 'mongoose';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneRepository');

export class EzoneRepository {
    private toQueryId(id: string): any {
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
        }
        return id;
    }

    async findByUserId(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        const idVal = this.toQueryId(userId);
        const orgVal = this.toQueryId(organizationId);

        return await EzoneAcademicProfile.findOne({
            $or: [
                { userId: idVal },
                { userId: userId }
            ]
        });
    }

    async upsertProfile(userId: string, organizationId: string, data: Partial<IEzoneAcademicProfile>): Promise<IEzoneAcademicProfile> {
        const idVal = this.toQueryId(userId);
        const orgVal = this.toQueryId(organizationId);

        const profile = await EzoneAcademicProfile.findOneAndUpdate(
            { 
                $or: [
                    { userId: idVal },
                    { userId: userId }
                ]
            },
            { 
                ...data,
                userId: idVal,
                organizationId: orgVal,
                lastSyncedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        logger.info('Ezone academic profile upserted for user:', userId);
        return profile;
    }
}
