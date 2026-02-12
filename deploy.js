const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a zip file for deployment
const createZip = () => {
    try {
        execSync('zip -r deploy.zip . -x "node_modules/*" ".git/*" "deploy.zip"', { stdio: 'inherit' });
        console.log('Zip created successfully');
    } catch (e) {
        console.error('Error creating zip:', e);
    }
};

createZip();
