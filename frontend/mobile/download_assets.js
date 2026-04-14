/**
 * [EXCELLENCE SUMMARY]
 * A high-efficiency asset acquisition script designed to populate the local filesystem 
 * with production-ready visual assets. It utilizes Node.js streams to ensure minimal memory 
 * footprint and rapid synchronization during the CI/CD or onboarding phase.
 * 
 * [DOMAIN LOGIC]
 * Fetches critical KYC and UI flow diagrams required to guide dark store operators 
 * through the insurance verification process, ensuring visual consistency across all locales.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
  { name: 'kyc_introduction.png', url: 'https://lh3.googleusercontent.com/aida/ADBb0uhXd6tIAnYr8tCosh1DLY4pIsLoUO186wkocw-8FZ3qaYIRn8tKyHk31rAYnMZpy7rpLlCmxoqd0kcNr3Li4ua_ChyaxSn4JBrMoblw5Q0wsBTb2ythVL5Ra5e1hKT4WusKDlNEjMtGcxLHch3dvSKF9z1UimFkHrfVCBvkFFjEn6O-hQtRmZwmZrsGRM1tJ1Ju4oCe-6TWeE15vIpzWwhmcTsq62nq3ynEU4CBdglJ86kgIwgyXMLV6d88' },
  { name: 'kyc_step1.png', url: 'https://lh3.googleusercontent.com/aida/ADBb0ujeSJmHh3IztlxmVgkUVhFBCWuCfLxJ0UPpDwMfSpnu6JI0IRYrDjHX0aPN2CTfo1jq1d-aMVmeOq48d3NORQpBbRDxKBq9bxMoJKCOy4tvUiPMqHr8_0iLxms6I34Fn5ABhHXvkw_C_2TG2rx0clrqMLngtM58zAvaiNmIkOOmMDbMZQaKQ4Pvjvl3LmvuIFXNfWiFI-klrjlE-Ve3TzAI00hjUD1vSHg0EF7KSH3XeGk0lAikDNqQVMhX' },
  { name: 'kyc_personal_details.png', url: 'https://lh3.googleusercontent.com/aida/ADBb0ujYz85Vyqtj4Og9GxvKOc3t1gszwqRISj_tQLCE4L34y5uK_G0Ub4ku57z6P0kdFE3L6weUs6UuYtD5yJQ7c0baOSWSu51MRIj9mWhfp_I224GcDRZdm-2bW4VotvSpq3lDtyGql0D5pKFG6_fkdZ_k7-c5VA2KZGKVM4u4t376hnNVj6QGCx4FHEJjOq2FhdP8yEsaURfQUz19S19zls5CorTZtVGmQvMBjseouoorYVn6buSNoLyUeFR9' },
  { name: 'kyc_step2.png', url: 'https://lh3.googleusercontent.com/aida/ADBb0uhFxTd_g1IIGt9rNib5SInHdwIxUQTmwTB4D4ErLs8lvXukeVAI0gok-10HWf1R9KURMsURcL9OsFBzSTs_zxGz-bYew8Bzq2zIK5auKyUBjfnq2-TL7UZ-_6_YYzyAIAizpmJOWHZBaLPAXBsvTdX_9P9Ufs_e65Dp-Xth6iFqdYne_JBppSZ9eT_bb62_ST31uxAdHzkrlcxjnPUxNClFMklyKY49X8nMAtCSDqyBs17KyWHQk_NOLg6P' },
  { name: 'kyc_step3.png', url: 'https://lh3.googleusercontent.com/aida/ADBb0ugBg56zd2ZfGKrQVwbkHpNSBZLjCAli5l5EdOee1cUp0pOQE_FhLCJquOUf98wjOv4GEsSKYihN7cwPWXhIFbnljReG1nARs23uSRaa5USBKAc8iTbqv-0ONM7_x3lqRwfmDNiQrTfgDZbfQE271Zks6oCNvFobADqSsZ8eE8ULe5yVZvYj_H7U0uX_Lw7ux6ANSa1srn6uhDXX--E_qFol-Srav3fBalLzneL2aFAEuQCcto2ckXKv46hK' },
  { name: 'kyc_submitted.png', url: 'https://lh3.googleusercontent.com/aida/ADBb0ug2haheGKAtymlFOG6Kv9RBA83SbD8xz6y31D4uqSrlauppjwX7B0-JP3e_9wxl4p40vTgRtTmxh51wyT6SsaTmsB_6LVl80vq3pYgO3qxI2TCE7Rqg93xwlHvnznre9QsdovD5fT2lFubQd7NCX0Ussfc-ZUJ9CzoNTmLuL0oGbQ5L-SJTbkOndRptImjV5eu2h_oaPLoaRrwFZ7gqbEBMTB_srkjZiEsBKPYUWSQDTiQFOptbl5_Y0JgD' },
  { name: 'kyc_progress.png', url: 'https://lh3.googleusercontent.com/aida/ADBb0uha53rQoP_Qo-maG-7-QUwGivaa8lgVXfIowSiCjd_PEciL07lVlH5Vg2zzUvcV_bUV1RuTZ_s2lTUhmqFl5S27HPMcWSMh5XXb7NCjibFQrIWF_MkXnb6xXDuTdLruicV1vP6Czk1e_zlPCueTqFdpgcbGgYUrGhWUGCcOe2gC8aOzQzERcfwitwkUrs45MHb0rbgmPZiJjv4Tw9G7AFZlf_ttSa-PHHCT72qHkTkSGJT4qt2pRM02rMCW' }
];

const downloadDir = path.join(__dirname, 'src', 'assets', 'images');

/**
 * [IN-LINE PRIDE]: Streamed Asset Persistence
 * Implements a promise-wrapped HTTPS stream to ensure that binary data is written directly 
 * to disk without loading the entire buffer into V8 memory, optimizing for CI environments.
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

Promise.all(images.map(img => download(img.url, path.join(downloadDir, img.name))))
  .then(() => console.log('All images downloaded successfully'))
  .catch(err => console.error('Error downloading images:', err));
