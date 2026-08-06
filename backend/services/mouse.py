import pyautogui



def move_mouse(x,y):


    pyautogui.moveRel(
        x,
        y,
        duration=0.05
    )


    return {
        "status":
        "moved"
    }




def click_mouse(button):


    pyautogui.click(
        button=button
    )


    return {
        "status":
        "clicked"
    }




def scroll_mouse(amount):


    pyautogui.scroll(
        amount
    )


    return {
        "status":
        "scrolled"
    }