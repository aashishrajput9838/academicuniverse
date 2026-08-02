import { EzoneAcademicProfile, IEzoneAcademicProfile } from '../../../models/EzoneAcademicProfile';
import mongoose from 'mongoose';
import User from '../../../models/User';
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

        // Fetch user email if userId resolves to a Mongo User
        let userEmail = '';
        if (idVal && mongoose.Types.ObjectId.isValid(userId)) {
            const userDoc = await User.findById(idVal).select('email firebaseUid').lean();
            if (userDoc) {
                userEmail = userDoc.email;
            }
        }

        const query: any = {
            $or: [
                { userId: idVal },
                { userId: userId }
            ]
        };

        if (userEmail) {
            query.$or.push({ email: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }

        logger.info(`[TRACE-PROFILE-LOOKUP] Input userId: ${userId} | idVal: ${idVal} | userEmail: ${userEmail}`);
        logger.info(`[TRACE-PROFILE-LOOKUP] Mongo Query: ${JSON.stringify(query)}`);

        const profile = await EzoneAcademicProfile.findOne(query);

        logger.info(`[TRACE-PROFILE-LOOKUP] Query Result: ${profile ? `FOUND Profile ID: ${profile._id}` : 'NOT FOUND (404)'}`);
        return profile;
    }

    async upsertProfile(userId: string, organizationId: string, data: Partial<IEzoneAcademicProfile>): Promise<IEzoneAcademicProfile> {
        const idVal = this.toQueryId(userId);
        const orgVal = this.toQueryId(organizationId);

        let userEmail = data.email || '';
        if (!userEmail && idVal && mongoose.Types.ObjectId.isValid(userId)) {
            const userDoc = await User.findById(idVal).select('email').lean();
            if (userDoc) {
                userEmail = userDoc.email;
            }
        }

        const query: any = {
            $or: [
                { userId: idVal },
                { userId: userId }
            ]
        };

        if (userEmail) {
            query.$or.push({ email: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }

        const profile = await EzoneAcademicProfile.findOneAndUpdate(
            query,
            { 
                ...data,
                userId: idVal,
                organizationId: orgVal,
                email: userEmail || data.email,
                lastSyncedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        logger.info('[TRACE-PROFILE-UPSERT] Profile upserted:', { profileId: profile._id, userId: idVal, email: userEmail });
        return profile;
    }
}
