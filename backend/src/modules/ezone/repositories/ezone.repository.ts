import { EzoneAcademicProfile, IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';
import mongoose from 'mongoose';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneRepository');

export class EzoneRepository {
    async findByUserId(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        return await EzoneAcademicProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(userId),
            organizationId: new mongoose.Types.ObjectId(organizationId)
        });
    }

    async upsertProfile(userId: string, organizationId: string, data: Partial<IEzoneAcademicProfile>): Promise<IEzoneAcademicProfile> {
        const profile = await EzoneAcademicProfile.findOneAndUpdate(
            { 
                userId: new mongoose.Types.ObjectId(userId),
                organizationId: new mongoose.Types.ObjectId(organizationId)
            },
            { 
                ...data,
                userId: new mongoose.Types.ObjectId(userId),
                organizationId: new mongoose.Types.ObjectId(organizationId),
                lastSyncedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        logger.info('Ezone academic profile upserted for user:', userId);
        return profile;
    }
}
