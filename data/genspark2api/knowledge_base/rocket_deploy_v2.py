import asyncio
from playwright.async_api import async_playwright

async def deploy():
    async with async_playwright() as p:
        # Launching with a specific viewport to ensure UI elements are visible
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        
        print("[1/4] Opening rocket.new...")
        await page.goto("https://rocket.new", wait_until="networkidle")
        
        # Handle cookie banner
        try:
            await page.click("text=Accept All", timeout=5000)
        except:
            pass
            
        prompt = "Create a professional business website for 'Vinland Security', an AI-native compliance agency specializing in NIST AI RMF for US solopreneurs. Use a clean, secure business style with Federal-Blue accents. Include a hero section with 'Frontier Resilience for the US AI Economy' and a pricing section with Spark ($49/mo) and Growth ($149/mo) tiers. Add a chat interface labeled 'Ask the NIST-Brain'. Make it production-ready for Netlify."
        
        print("[2/4] Entering Vinland Security prompt...")
        # Rocket.new uses a specific textarea or contenteditable div
        await page.fill("textarea", prompt)
        
        print("[3/4] Triggering build...")
        await page.press("textarea", "Enter")
        
        # Wait for the generation process to start and potentially redirect
        print("Waiting for generation (this can take 60-120s)...")
        
        # We wait for the URL to change from the base home page
        for i in range(24): # Wait up to 2 minutes (24 * 5s)
            await asyncio.sleep(5)
            current_url = page.url
            print(f"Polling... Current URL: {current_url}")
            if "rocket.new" in current_url and len(current_url) > 25:
                print(f"Generation link caught: {current_url}")
                # Try to find a Netlify mention
                content = await page.content()
                if "netlify" in content.lower():
                    print("Build confirmed for Netlify.")
                    break
        
        print(f"[4/4] Final Snapshot URL: {page.url}")
        await page.screenshot(path="/home/skywork/workspace/iventure-studio/storage/deployment_screenshot.png")
        print("Screenshot saved to storage/deployment_screenshot.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(deploy())
