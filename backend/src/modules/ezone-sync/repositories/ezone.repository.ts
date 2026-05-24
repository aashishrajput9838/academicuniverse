import { EzoneProfile, IEzoneProfile } from '../../../models/EzoneProfile';
import mongoose from 'mongoose';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneRepository');

export class EzoneRepository {
    async findByUserId(userId: string, organizationId: string): Promise<IEzoneProfile | null> {
        return await EzoneProfile.findOne({ 
            userId: new mongoose.Types.ObjectId(userId),
            organizationId: new mongoose.Types.ObjectId(organizationId)
        });
    }

    async upsertProfile(userId: string, organizationId: string, profileData: Partial<IEzoneProfile>): Promise<IEzoneProfile> {
        try {
            const query = { 
                userId: new mongoose.Types.ObjectId(userId),
                organizationId: new mongoose.Types.ObjectId(organizationId)
            };
            
            const update = {
                ...profileData,
                lastSyncedAt: new Date(),
                syncStatus: 'SUCCESS' as const
            };

            const options = { upsert: true, new: true, setDefaultsOnInsert: true };

            const profile = await EzoneProfile.findOneAndUpdate(query, update, options);
            if (!profile) throw new Error('Failed to upsert ezone profile');
            
            return profile;
        } catch (error: any) {
            logger.error('Error upserting ezone profile:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }

    async updateSyncStatus(userId: string, organizationId: string, status: 'SUCCESS' | 'FAILED' | 'PENDING'): Promise<void> {
        await EzoneProfile.updateOne(
            { 
                userId: new mongoose.Types.ObjectId(userId),
                organizationId: new mongoose.Types.ObjectId(organizationId)
            },
            { syncStatus: status }
        );
    }
}
