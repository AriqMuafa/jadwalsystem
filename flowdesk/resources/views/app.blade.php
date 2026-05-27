<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1a1714" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Flowdesk" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>Flowdesk - Productivity Planner</title>
    <link rel="icon" href="/icons/flowdesk-icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icons/flowdesk-192.png" />
    <link rel="manifest" href="/build/manifest.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @inertiaHead
  </head>
  <body class="min-h-screen bg-sand-50 text-ink font-body">
    @inertia
  </body>
</html>
