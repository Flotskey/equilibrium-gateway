import { Injectable, Logger } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly logger: Logger
  ) {}

  async validateToken(token: string): Promise<DecodedIdToken | null> {
    try {
      const decodedToken = await this.firebaseService.getAuth().verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      this.logger.error('Firebase token verification failed', error.stack, AuthService.name);
      return null;
    }
  }
}
