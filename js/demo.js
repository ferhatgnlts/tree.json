document.addEventListener('DOMContentLoaded', function () {
    const sampleData = {
        status: 'success',
        data: {
            user: {
                id: 12345,
                name: 'John Doe',
                email: 'john.doe@example.com',
                active: true,
                roles: ['admin', 'user'],
                preferences: {
                    theme: 'dark',
                    notifications: {
                        email: true,
                        push: false
                    }
                },
                metadata: null
            },
            products: [
                {
                    id: 1,
                    name: 'Laptop',
                    price: 999.99,
                    inStock: true,
                    features: ['16GB RAM', '512GB SSD', 'Intel i7']
                },
                {
                    id: 2,
                    name: 'Smartphone',
                    price: 699.99,
                    inStock: false,
                    features: ['6.5" Display', '128GB Storage', '5G']
                }
            ],
            stats: {
                totalUsers: 42,
                activeUsers: 37,
                inactiveUsers: 5
            }
        },
        timestamp: '2023-05-15T12:34:56Z',
        version: '1.0.0'
    };

    // A second, unrelated JSON payload just to show off the static output.
    const staticData = {
        service: 'payments-api',
        region: 'eu-west-1',
        healthy: true,
        latencyMs: 42
    };

    // That's the whole integration: one container, one constructor call.
    const viewer = new TreeJSON('#viewer', {
        data: sampleData,
        theme: 'light',
        editable: true,
        showThemeToggle: true,
        // Keep the static example's theme in sync with the main viewer,
        // just for a cohesive demo — this is entirely optional.
        onThemeChange: (theme) => renderStaticExample(theme)
    });

    function renderStaticExample(theme) {
        document.getElementById('static-example').innerHTML = TreeJSON.toHTML(staticData, { theme });
    }

    renderStaticExample(viewer.getTheme());
});
