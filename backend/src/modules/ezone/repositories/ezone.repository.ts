import { EzoneAcademicProfile, IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';
import mongoose from 'mongoose';
import { Logger } from '../../../shared/utils';
import { toObjectId } from '../../../utils/mongooseHelpers';

const logger = new Logger('EzoneRepository');

export class EzoneRepository {
    async findByUserId(userId: string, organizationId: string): Promise<IEzoneAcademicProfile | null> {
        return await EzoneAcademicProfile.findOne({ 
            userId: toObjectId(userId),
            organizationId: toObjectId(organizationId)
        });
    }

    async upsertProfile(userId: string, organizationId: string, data: Partial<IEzoneAcademicProfile>): Promise<IEzoneAcademicProfile> {
        const profile = await EzoneAcademicProfile.findOneAndUpdate(
            { 
                userId: toObjectId(userId),
                organizationId: toObjectId(organizationId)
            },
            { 
                ...data,
                userId: toObjectId(userId),
                organizationId: toObjectId(organizationId),
                lastSyncedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        logger.info('Ezone academic profile upserted for user:', userId);
        return profile;
    }
}
