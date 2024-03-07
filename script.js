$(document).ready(function () {
    const coinList = $('#coin-list')
    const cache = {} // Cache object to store data and timestamps
    /** @type {string[]} */
    const selectedCoins = [] // Array to store selected coins
    /** @type {{ id: string, symbol: string, name: string }[]}  */
    const coinsData = []

    // Fetch data from the API
    $.ajax({
        url: 'https://api.coingecko.com/api/v3/coins/list',
        method: 'GET',
        success: function (data) {
            data = data.slice(0, 50)
            data.sort(ascending('symbol'))
            coinsData.push(...data)
            // Create a coin item for each coin in the response
            $.each(data, function (index, coin) {
                const coinItem = createCoinItem(coin)
                coinList.append(coinItem)
            })
        },
        error: function (error) {
            console.error('Error:', error)
        }
    })

    // Create a coin item element
    function createCoinItem(coin) {
        const coinItem = $('<div>').addClass('coin-item')

        const title = $('<h2>').text(coin.symbol)
        const subtitle = $('<p>').text(coin.name)
        const moreInfoBtn = $('<button>')
            .addClass('more-info-btn')
            .text('More Info')
        const toggleBtn = $('<button>')
            .addClass('toggle-btn')
            .attr('data-coin', coin.id)
        const progressBarContainer = $('<div>').addClass(
            'progress-bar-container'
        )
        const loadingBar = $('<div>').addClass('loading-bar')
        const progressBar = $('<div>').addClass('progress-bar')
        const collapsible = $('<div>')
            .addClass('collapsible')
            .addClass('collapsed')
        const content = $('<div>').addClass('content')

        toggleBtn.on('click', function () {
            const coinId = coin.id

            if (toggleBtn.hasClass('active')) {
                // Remove coin from selected coins
                toggleBtn.toggleClass('active') // Toggle the "active" class on button click
                const index = selectedCoins.indexOf(coinId)
                if (index > -1) {
                    selectedCoins.splice(index, 1)
                }
            } else {
                // Add selected coin if less than 5 selected coins
                if (selectedCoins.length < 5) {
                    selectedCoins.push(coinId)
                    toggleBtn.toggleClass('active') // Toggle the "active" class on button click
                } else {
                    // Show popup with selected coins if 5 coins already selected
                    showSelectedCoinsModal(coinId)
                }
            }
        })

        moreInfoBtn.on('click', function () {
            const coinId = coin.id
            const cachedData = cache[coinId]

            // Check if collapsible is currently visible
            const isCollapsibleVisible = !collapsible.hasClass('collapsed')

            // Hide collapsible if it's already visible
            if (isCollapsibleVisible) {
                collapsible.addClass('collapsed')
                return // Exit the function
            }

            // Check if cached data exists and is within the time limit
            if (cachedData && isCacheValid(cachedData.timestamp)) {
                // Display data from cache
                displayCoinData(content, cachedData.data)
            } else {
                // Fetch data from the API
                fetchCoinData(coinId, content, progressBarContainer)
            }

            collapsible.removeClass('collapsed')
        })
        loadingBar.append(progressBar)
        progressBarContainer.append(loadingBar)
        collapsible.append(content)
        coinItem.append(
            title,
            subtitle,
            moreInfoBtn,
            progressBarContainer,
            toggleBtn,
            collapsible
        )

        return coinItem
    }

    // Fetch coin data from the API
    function fetchCoinData(coinId, content, progressBarContainer) {
        // Show progress bar
        progressBarContainer.addClass('show')
        $.ajax({
            url: `https://api.coingecko.com/api/v3/coins/${coinId}`,
            method: 'GET',
            success: function (data) {
                const coinData = {
                    image: data.image.thumb,
                    market_data: {
                        current_price: {
                            usd: data.market_data.current_price.usd,
                            ils: data.market_data.current_price.ils,
                            eur: data.market_data.current_price.eur
                        }
                    }
                }

                // Save data in cache with current timestamp
                cache[coinId] = {
                    data: coinData,
                    timestamp: Date.now()
                }

                // Hide progress bar
                setTimeout(() => progressBarContainer.removeClass('show'), 100)

                // Display coin data
                displayCoinData(content, coinData)
            },
            error: function (error) {
                console.error('Error:', error)
                // Hide progress bar
                progressBarContainer.removeClass('show')
            }
        })
    }

    // Display coin data in the content area
    function displayCoinData(content, data) {
        content.empty()

        const image = $('<img>').attr('src', data.image)
        const usdPrice = $('<p>').text(
            `USD: ${data.market_data.current_price.usd ?? '???'} $`
        )
        const ilsPrice = $('<p>').text(
            `ILS: ${data.market_data.current_price.ils ?? '???'} ₪`
        )
        const eurPrice = $('<p>').text(
            `EUR: ${data.market_data.current_price.eur ?? '???'} €`
        )

        content.append(image, usdPrice, ilsPrice, eurPrice)
    }

    // Check if cache data is valid (within 2 minutes)
    function isCacheValid(timestamp) {
        const currentTime = Date.now()
        const cacheTime = 2 * 60 * 1000 // 2 minutes in milliseconds

        return currentTime - timestamp < cacheTime
    }

    function showSelectedCoinsModal(selectedCoinId) {
        const modal = $('<div>').addClass('modal')
        const modalContent = $('<div>').addClass('modal-content')
        const coinsList = $('<ul>').addClass('selected-coins-list')

        // Create list items for each selected coin
        selectedCoins.forEach(function (coinId) {
            const coin = coinsData.find((c) => c.id === coinId)
            const coinItem = $('<li>').text(coin.symbol)
            const removeBtn = $('<button>')
                .addClass('toggle-btn')
                .addClass('remove-coin-btn')
                .addClass('active')

            removeBtn.on('click', function () {
                // Remove the selected coin and update the UI
                removeBtn.toggleClass('active')
                const index = selectedCoins.indexOf(coinId)
                setTimeout(() => modal.remove(), 300) // Hide the modal
                if (index > -1) {
                    selectedCoins.splice(index, 1) // Remove the coin from selectedCoins array
                }
                selectedCoins.push(selectedCoinId) // Select the new coin the user interacts with
                toggleCoinsSelection()
            })

            coinItem.append(removeBtn)
            coinsList.append(coinItem)
        })

        const modalCloseBtn = $('<button>')
            .addClass('modal-close-btn')
            .text('Close')

        modalCloseBtn.on('click', function () {
            modal.remove() // Close the modal
        })

        modalContent.append(coinsList, modalCloseBtn)
        modal.append(modalContent)
        $('body').append(modal)
        toggleCoinsSelection()
    }

    function toggleCoinsSelection() {
        $('.coin-item .toggle-btn').each(function () {
            const coinId = $(this).data('coin') + ''
            if (selectedCoins.includes(coinId)) {
                $(this).addClass('active')
            } else {
                $(this).removeClass('active')
            }
        })
    }
})

function ascending(key) {
    return (a, b) => {
        if (a[key] > b[key]) return 1
        if (a[key] < b[key]) return -1
        return 0
    }
}
