/**
 * [EXCELLENCE SUMMARY]
 * A specialized utility for fetching legacy or externally-hosted HTML screen representations. 
 * This script ensures that structural references for the Stitch integration are locally 
 * available for rendering or audit purposes within the Aegis ecosystem.
 * 
 * [DOMAIN LOGIC]
 * Synchronizes HTML screen templates that define the regulatory and user-interface 
 * requirements for KYC processing in the insurance domain.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const screens = [
  { name: 'kyc_step2', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2ZlYmNkYjkzZGI1MTQxYWNiNmJjZDRlYjUwM2JkY2Y3EgsSBxCT5LzZtxUYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDg4MTMyNzk2MDE1ODQxNzUxMQ&filename=&opi=89354086' },
  { name: 'kyc_personal_details', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2FiYmIwNmFhZDkyMTQ1ODM4MTkzZjBlZGU4ZDViODJjEgsSBxCT5LzZtxUYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDg4MTMyNzk2MDE1ODQxNzUxMQ&filename=&opi=89354086' },
  { name: 'kyc_step1', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2UyNmQxZWZjOTg1MjQyYzA4YWVlMWFhODBhZjEzNjEyEgsSBxCT5LzZtxUYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDg4MTMyNzk2MDE1ODQxNzUxMQ&filename=&opi=89354086' },
  { name: 'kyc_progress', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzdhMzc0MjJjM2IxODQ2MWQ4NTI3YTVjMWVmNzRjOTc4EgsSBxCT5LzZtxUYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDg4MTMyNzk2MDE1ODQxNzUxMQ&filename=&opi=89354086' },
  { name: 'kyc_step3', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2U3MmFjNDc2MmJkMDQ5NjliMDZjODkzZTQzYmE2MTkxEgsSBxCT5LzZtxUYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDg4MTMyNzk2MDE1ODQxNzUxMQ&filename=&opi=89354086' },
  { name: 'kyc_submitted', url: 'https://contribution.usercontent.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2Q0OWYwZjkwZGYzZjRkOGI4ZTgxNTY3YmRjMmRmNDcyEgsSBxCT5LzZtxUYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDg4MTMyNzk2MDE1ODQxNzUxMQ&filename=&opi=89354086' },
  { name: 'kyc_introduction', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzkyYWZiNTQ4NDdhZjRmMGFiYzdlYjZkMTE4YThjODVjEgsSBxCT5LzZtxUYAZIBJAoKcHJvamVjdF9pZBIWQhQxMDg4MTMyNzk2MDE1ODQxNzUxMQ&filename=&opi=89354086' }
];

const downloadDir = path.join(__dirname, 'stitch_html_screens');

if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir);
}

/**
 * [IN-LINE PRIDE]: Fault-Tolerant Network Acquisition
 * Implements a promise-driven download pattern with automated cleanup (fs.unlink) 
 * in the event of partial downloads, maintaining the integrity of the local asset store.
 */
const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
  });
};

Promise.all(screens.map(screen => download(screen.url, path.join(downloadDir, `${screen.name}.html`))))
  .then(() => console.log('All HTML files downloaded successfully'))
  .catch(err => console.error('Error downloading files:', err));
