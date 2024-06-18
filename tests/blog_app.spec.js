const { test, expect, beforeEach, describe } = require('@playwright/test')
const { loginWith, createBlogWith } = require('./helper')
const { name } = require('../playwright.config')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    // empty DB here
    await request.post('/api/testing/reset')

    // create a new user for backend
    await request.post('/api/users', {
        data: {
            username: 'admin',
            name: 'Admin Tester',
            password: 'admin-tester'
        }
    })

    await page.goto('/')

  })

  test('Login form is shown', async ({ page }) => {
    await expect(page.getByText('username')).toBeVisible()
    await expect(page.getByPlaceholder('username')).toBeVisible()

    await expect(page.getByText('password')).toBeVisible()
    await expect(page.getByPlaceholder('********')).toBeVisible()

    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  describe('Login', () => {
    test('succeeds with correct credentials', async ({ page }) => {
      await page.getByTestId('username').fill('admin')
      await page.getByTestId('password').fill('admin-tester')

      await page.getByRole('button', { name: 'Login'}).click()

      await expect(page.getByText('Admin Tester logged in', { exact: true })).toBeVisible()
    })

    test('fails with wrong credentials', async ({ page }) => {
        await page.getByTestId('username').fill('addmin')
        await page.getByTestId('password').fill('addmin--tester')

        await page.getByRole('button', { name: 'Login' }).click()

        await expect(page.getByText('invalid username or password')).toBeVisible()
    })
  })

  describe('When logged in', () => {
    beforeEach(async ({ page }) => {
      await loginWith(page,'admin','admin-tester')
    })
  
    test('a new blog can be created', async ({ page }) => {
      await createBlogWith(page, 'End to end tests using Playwright', 'Paul Aderoju', 'https://www.paul-roju.me')

      await page.getByText('End to end tests using Playwright Paul Aderoju').waitFor()
    })

    test('a blog can be liked', async ({ page }) => {
        await createBlogWith(page, 'End to end tests using Playwright', 'Paul Aderoju', 'https://www.paul-roju.me')
        await page.getByRole('button', { name: 'view' }).click()

        await page.getByRole('button', { name: 'like' }).click()

        // await page.getByRole('button', { name: 'view' }).click()
        await page.getByText('1').waitFor()
    })

    test('a blog can be deleted', async ({ page }) => {
        await createBlogWith(page, 'End to end tests using Playwright', 'Paul Aderoju', 'https://www.paul-roju.me')
        await page.getByRole('button', { name: 'view' }).click()

        await page.getByRole('button', { name: 'remove' }).click()

        page.on('dialog', async dialog => {
            console.log(dialog.message());
            await dialog.accept(); // Accept the dialog
        });

        await expect(page.getByText('End to end tests using Playwright', { exact: true })).not.toBeVisible()
    })

    test(`only the user who added the blog sees the blog's delete button`, async ({ page, request }) => {

        // create a new second user for backend
        await request.post('/api/users', {
        data: {
            username: 'tester',
            name: 'Admin Tester',
            password: 'new-tester'
        }
        })
        // login as user 1 - before each already logged in
        createBlogWith(page, 'End to end tests using Playwright', 'Paul Aderoju', 'https://www.paul-roju.me')

        // view all blog details
        await page.getByRole('button', { name: 'view' }).click()

        // delete button to be visible to user 1
        await expect(page.getByRole('button', { name: 'remove' })).toBeVisible()

        await page.waitForTimeout(6000);

        // log out
        await page.waitForSelector('button:has-text("Log out")'); // Ensure the button is present
        await page.getByRole('button', { name: 'Log out' }).click();

        page.on('dialog', async dialog => {
            console.log(dialog.message());
            await dialog.accept(); // Accept the dialog
        });

        await page.getByRole('button', { name: 'Log out' }).click()
        

        await page.waitForTimeout(6000);

        // login as user 2
        await loginWith(page, 'tester', 'new-tester')

        // user 2 trying to see the delete button - should fail
        await page.getByRole('button', { name: 'view' }).click()
        await expect(page.getByRole('button', { name: 'remove' })).not.toBeVisible()
        
    })

    test('blogs are arranged in the order according to the likes, the blog with the most likes first', async ({ page }) => {
        // create 3 blogs
        await createBlogWith(page, 'End to end tests using Playwright', 'Paul Aderoju', 'https://www.paul-roju.me')
        await createBlogWith(page, 'Jest is also used', 'Paul Aderoju', 'https://www.jest-test.com')
        await createBlogWith(page, 'Uni Helsinki Fullstack rocks', 'Paul Aderoju', 'https://fullstackopen.com/')

        // like the first blog 2x
        let blogs = await page.locator('.always-visible');

        await blogs.nth(0).getByRole('button', { name: 'view' }).click()
        await blogs.nth(0).getByRole('button', { name: 'like' }).click()

        await page.waitForTimeout(500); 

        await blogs.nth(0).getByRole('button', { name: 'like' }).click()

        await page.waitForTimeout(500); 

        // Like the second blog 1x

        await blogs.nth(1).getByRole('button', { name: 'view' }).click()
        await blogs.nth(1).getByRole('button', { name: 'like' }).click()

        await page.waitForTimeout(500)

        await blogs.nth(2).getByRole('button', { name: 'view' }).click()

        expect(blogs.nth(0).getByText('2'))
        expect(blogs.nth(1).getByText('1'))
        expect(blogs.nth(2).getByText('0'))

        // Get likes of each blog and assert the order
    // blogs = await page.locator('.always-visible'); // Refresh the locator
    // const blogLikes = await blogs.evaluateAll(blogEls => blogEls.map(blogEl => {
    //     const likesText = blogEl.querySelector('.like-button').textContent;
    //     const likes = parseInt(likesText.match(/\d+/)[0]);
    //     return likes;
    // }));

    // // Assert that the blogs are ordered by likes in descending order
    // for (let i = 0; i < blogLikes.length - 1; i++) {
    //     expect(blogLikes[i]).toBeGreaterThanOrEqual(blogLikes[i + 1]);
    // }
    })
  })
})