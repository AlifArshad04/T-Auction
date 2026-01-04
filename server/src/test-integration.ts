import * as dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from './config/database';
import { configureCloudinary } from './config/cloudinary';
import { playerService } from './services/playerService';
import { uploadBase64Image } from './services/uploadService';
import { PlayerCategory } from './models/Player';

async function testMongoDBAndCloudinary() {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    await connectDatabase();

    // Configure Cloudinary
    console.log('Configuring Cloudinary...');
    configureCloudinary();

    // Sample player data
    const samplePlayer = {
      name: 'John Doe',
      department: 'Computer Science',
      position: 'Software Developer',
      category: PlayerCategory.A
    };

    // Sample image (small PNG in base64 data URL format)
    const sampleImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    console.log('Uploading sample image to Cloudinary...');
    const uploadResult = await uploadBase64Image(sampleImageBase64, 'players', `test-player-${Date.now()}`);

    if (!uploadResult.success) {
      throw new Error(`Image upload failed: ${uploadResult.error}`);
    }

    console.log('Image uploaded successfully:', uploadResult.url);

    // Create player with uploaded image
    console.log('Creating sample player...');
    const player = await playerService.create({
      ...samplePlayer,
      photoId: uploadResult.publicId,
      photoUrl: uploadResult.url
    });

    console.log('Player created successfully:', {
      id: player._id,
      name: player.name,
      photoUrl: player.photoUrl,
      photoId: player.photoId
    });

    console.log('✅ MongoDB and Cloudinary integration test passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the test
testMongoDBAndCloudinary();