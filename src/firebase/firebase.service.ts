import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables');
    }

    const firebaseConfig = {
      projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      privateKey: privateKey.replace(/\\n/g, '\n')
    };

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig)
      });
    }
  }

  getAuth() {
    return admin.auth();
  }
}
