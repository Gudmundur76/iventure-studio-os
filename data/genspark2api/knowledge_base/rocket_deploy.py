import asyncio
from playwright.async_api import async_playwright

async def deploy():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Opening rocket.new...")
        await page.goto("https://rocket.new")
        
        # Handle cookie banner if it appears
        try:
            await page.click("text=Accept All", timeout=5000)
        except:
            pass
            
        prompt = "Create a professional business website for 'Vinland Security', an AI-native compliance agency specializing in NIST AI RMF for US solopreneurs. Use a clean, secure business style with Federal-Blue accents. Include a hero section with 'Frontier Resilience for the US AI Economy' and a pricing section with Spark ($49/mo) and Growth ($149/mo) tiers. Add a chat interface labeled 'Ask the NIST-Brain'. Make it production-ready for Netlify."
        
        print("Entering prompt...")
        await page.fill("textarea", prompt) # Assuming textarea or similar
        
        print("Submitting build...")
        await page.press("textarea", "Enter")
        
        # Wait for deployment URL to appear
        # This part is speculative based on how rocket.new UI usually works
        await asyncio.sleep(30)
        print(f"Current URL: {page.url}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(deploy())
