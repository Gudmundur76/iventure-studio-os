import asyncio
from playwright.async_api import async_playwright

async def deploy():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Opening rocket.new...")
        await page.goto("https://rocket.new", wait_until="networkidle")
        
        # Handle cookie banner
        try:
            await page.click("button:has-text('Accept All')", timeout=3000)
        except:
            pass
            
        prompt = "Create a professional business website for 'Vinland Security', an AI-native compliance agency specializing in NIST AI RMF for US solopreneurs. Use a clean, secure business style with Federal-Blue accents. Include a hero section with 'Frontier Resilience for the US AI Economy' and a pricing section with Spark ($49/mo) and Growth ($149/mo) tiers. Add a chat interface labeled 'Ask the NIST-Brain'. Make it production-ready for Netlify."
        
        print("Filling prompt...")
        # Target the prompt box specifically
        await page.fill("textarea", prompt)
        await asyncio.sleep(1)
        
        print("Clicking Submit...")
        # Try to click the submit button (usually an icon or button next to textarea)
        # Based on common patterns or previous refs
        try:
            # Look for the submit button specifically
            submit_btn = page.locator("button[aria-label='Submit prompt'], button:has(svg), button.bg-primary")
            await submit_btn.first.click()
        except:
            await page.press("textarea", "Enter")
        
        print("Waiting for generation...")
        for i in range(30):
            await asyncio.sleep(5)
            url = page.url
            print(f"URL: {url}")
            if "rocket.new/" in url and len(url) > 25:
                print(f"SUCCESS: Project created at {url}")
                break
            
            # Check for error or login wall
            content = await page.content()
            if "Sign in" in content and i > 2:
                print("Wall: Login required for deployment.")
                break
        
        await page.screenshot(path="/home/skywork/workspace/iventure-studio/storage/last_deploy_attempt.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(deploy())
